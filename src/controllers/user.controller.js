import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import JWT from "jsonwebtoken";


const getAccessAndRefreshToken = async (user) => {
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //Store refresh token in database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); //validateBeforeSave: false mane user schema te je validation gulo ache shegulo validate korbe na. karon user schema te refreshToken field nai. tai validateBeforeSave: false use kora hoyeche.

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Error generating access and refresh token", error.message);
    }
};

const userRegister = asyncHandler(async (req, res) => {

    //Get user details from frontend 
    const { fullName, email, userName, password } = req.body;

    //Validate user details
    if (!fullName || !email || !userName || !password) {
        throw new ApiError(400, "All fields are required");
    }

    //Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { userName }] });
    if (existingUser) {
        throw new ApiError(400, "User already exists");
    }

    //Deal with avatar and coverImage if they are provided (Files are uploaded using multer)

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    //Upload avatar and coverImage to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    //Create new user
    const user = await User.create({
        fullName,
        email,
        userName,
        password,
        avatar: avatar?.url, //Avatar is required so no need to check for null value but coverImage is optional so we need to check for null value.
        coverImage: coverImage?.url || "",
    });


    //user schema theke refresh token and password  remove kore db tea pathabo
    const createdUser = await User.findById(user._id).select("-password -refreshToken"); //-password -refreshToken mane ei field gulo db theke remove kore pathabo.
    if (!createdUser) {
        throw new ApiError(500, "User not created");
    }

    //Send response to frontend
    res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser));

});

const userLogin = asyncHandler(async (req, res) => {

    // const { email, userName, password } = req.body ?? {};

    // if ((!email && !userName)|| !password) {
    //     throw new ApiError(400, "Email/username or password is required");
    // }


    // //Check if user exists
    // const user = await User.findOne({ $or: [ {email}, { userName }] });
    // if (!user) {
    //     throw new ApiError(404, "User not found");
    // }

    //my logic 
    const { emailOrUserName, password } = req.body ?? {};

    if (!emailOrUserName || !password) {
        throw new ApiError(400, "Email/username or password is required");
    }
    let email = emailOrUserName;
    let userName = emailOrUserName;

    //Check if user exists
    const user = await User.findOne({ $or: [{ email }, { userName }] });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    //my logic end

    //Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid password");
    }

    //Generate refresh token and access token
    const { accessToken, refreshToken } = await getAccessAndRefreshToken(user);

    //Send response to frontend
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken"); //-password -refreshToken mane ei field gulo db theke remove kore pathabo.



    const options = {
        httpOnly: true,
        secure: true, // Set secure flag in production
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));


});

const userLogout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            refreshToken: "" //Remove refresh token from database on logout
        },
        {
            new: true
        }); //new: true mane update howar porer user object return korbe. na hole update howar ageer user object return korbe.

    //cookie theke access token and refresh token remove korbo
    const options = {
        httpOnly: true,
        secure: true, // Set secure flag in production
    };

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, "User logged out successfully"));

});


const refreshAccessToken = asyncHandler(async (req, res) => {
    const inComingRefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "") || req.body?.refreshToken; //replace because authorization header is in the format "Bearer <token>" we need to remove the "Bearer " part to get
    if (!inComingRefreshToken) {
        throw new ApiError(400, "Refresh token is required");
    }

    try {
        const decodedToken = JWT.verify(inComingRefreshToken, process.env.RefreshTokenSecret);
        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (user?.refreshToken !== inComingRefreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        const options = {
            httpOnly: true,
            secure: true, // Set secure flag in production
        };

        const { accessToken, newrefreshToken } = await getAccessAndRefreshToken(user);

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newrefreshToken }, "Access token refreshed successfully"));

    }
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// soja banglai je sob method hit korte must loggin thaka lage oder secured route bole. ate auth.middlewire theke verifyiwt kora hoy sekhane req.user e user object ta pathano hoy.  so oikhan theke user._id diye user db theke shate contact korte pari. 
const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    const user = await User.findById(req.user._id); // ai user ta verifyJWT middleware theke asche. karon change password route ta secured route. so user must be logged in to access this route. so verifyJWT middleware will check if the user is logged in or not. If the user is not logged in, it will throw an error and the user will not be able to access this route.

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isOldPasswordCorrect = await user.comparePassword(oldPassword);
    if (!isOldPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save(); //save method will trigger the pre-save hook in user model to hash the new password before saving it to the database.

    return res.status(200).json(new ApiResponse(200, null, "Password changed successfully"));
});



const getCurrentUser = asyncHandler(async (req, res) => {
    //Jwt token theke user id ber kore user object ta database theke ber korbo. karon verifyJWT middleware already check koreche je user logged in ache kina. so user object ta req.user e ache. so amra req.user theke user object ta ber korbo.
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName && !email) {
        throw new ApiError(400, "At least one field (fullName or email) is required to update");
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: { fullName, email: email }
        }).select("-password -refreshToken");


    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});



//ata onno update er shate rakha hoy naikaron aikhane file handle korte hoy. 
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avaterLocalPath = req.file?.path; //multer middleware theke file path ta asche. karon multer middleware already handle koreche file upload kora. so req.file e file object ta ache. so req.file.path e file path ta ache.
    if (!avaterLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avaterLocalPath);

    if (!avatar?.url) {
        throw new ApiError(500, "Error uploading avatar image");
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: { avatar: avatar.url }
        }).select("-password -refreshToken");

    return res.status(200)
        .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path; //multer middleware theke file path ta asche. karon multer middleware already handle koreche file upload kora. so req.file e file object ta ache. so req.file.path e file path ta ache.
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage?.url) {
        throw new ApiError(500, "Error uploading cover image");
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: { coverImage: coverImage.url }
        }).select("-password -refreshToken");

    return res.status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
});



export {
    userRegister,
    userLogin,
    userLogout,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateUserAvatar,
    updateAccountDetails,
    updateUserCoverImage,

}
