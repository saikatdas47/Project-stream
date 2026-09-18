import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import JWT from "jsonwebtoken";
import mongoose from "mongoose";


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
    res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));

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
        secure: process.env.NODE_ENV === "production",
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
        secure: process.env.NODE_ENV === "production",
    };

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, "User logged out successfully"));

});


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "") || req.body?.refreshToken; //replace because authorization header is in the format "Bearer <token>" we need to remove the "Bearer " part to get
    if (!incomingRefreshToken) {
        throw new ApiError(400, "Refresh token is required");
    }

    try {
        const decodedToken = JWT.verify(incomingRefreshToken, process.env.RefreshTokenSecret);
        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (user?.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        };

        const { accessToken, refreshToken: newRefreshToken } = await getAccessAndRefreshToken(user);

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));

    }
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});






// soja banglai je sob method hit korte must login thaka lage oder secured route bole. ate auth.middleware theke verifyJWT kora hoy sekhane req.user e user object ta pathano hoy. so oikhan theke user._id diye user db er shathe contact korte pari.
const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    const user = await User.findById(req.user?._id); // ai user ta verifyJWT middleware theke asche. karon change password route ta secured route. so user must be logged in to access this route. so verifyJWT middleware will check if the user is logged in or not. If the user is not logged in, it will throw an error and the user will not be able to access this route.

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

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: { fullName, email }
        },
        {
            new: true,
            runValidators: true
        }).select("-password -refreshToken");


    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});


//ata onno update er shate rakha hoy naikaron aikhane file handle korte hoy. 
const updateUserAvatar = asyncHandler(async (req, res) => {



    const avatarLocalPath = req.file?.path; //multer middleware theke file path ta asche. karon multer middleware already handle koreche file upload kora. so req.file e file object ta ache. so req.file.path e file path ta ache.
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.url) {
        throw new ApiError(500, "Error uploading avatar image");
    }

    // Delete the old avatar only after the new image uploads successfully.
    if (req.user?.avatar) {
        const publicId = req.user.avatar.split('/').pop().split('.')[0]; // Extract public ID from the URL
        await deleteFromCloudinary(publicId);
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
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

    // Delete the old cover image only after the new image uploads successfully.
    if (req.user?.coverImage) {
        const publicId = req.user.coverImage.split('/').pop().split('.')[0]; // Extract public ID from the URL
        await deleteFromCloudinary(publicId);
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: { coverImage: coverImage.url }
        }).select("-password -refreshToken");

    return res.status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
});







//profile dekhanor jonno 
//username diye call korbo oi user er information with aggregation pipeline use kore subscriber count, subscription count soho alada table banabe. aikhane table e document bola hoy mongo db te


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username.trim()) { //trim mane username er age ba pore je kono space thakle sheta remove kore dibe. jodi username empty hoy tahole error throw korbe.
        throw new ApiError(400, "Username is required");
    }


    const channel = await User.aggregate([
        {
            $match: { userName: username } //match mane je userName ta pathano hoyeche sheta match korbe. 
        },
        {
            $lookup: {
                from: "subscriptions", //subscriptions collection theke data niye asbe.
                localField: "_id", //user collection er _id field ta use korbe.
                foreignField: "channel", //subscriptions collection er channel field ta use korbe.
                as: "subscribers" //chennal count korte parle subscriber count ber korbe. $size mane array er size ber korbe.
            }
        },
        {
            $lookup: {
                from: "subscriptions", //subscriptions collection theke data niye asbe.
                localField: "_id", //user collection er _id field ta use korbe.
                foreignField: "subscriber", //subscriptions collection er subscriber field ta use korbe.
                as: "subscribeTo" //subscriptions name e array banabe. jekhane oi user er subscriptions thakbe.
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                subscribedChannelCount: { $size: "$subscribeTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //check if the logged in user is subscribed to this channel or not.
                        then: true,
                        else: false
                    }
                }
            }
        },

        {
            $project: {
                fullName: 1,
                userName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscribedChannelCount: 1,
                isSubscribed: 1
            }



        }
    ]);

    if (!channel || channel.length === 0) {
        throw new ApiError(404, "Channel not found");
    }

    return res.status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"));
});




const getUserHistory = asyncHandler(async (req, res) => {

    // Get the user's history //nasted aggregation pipeline use kore user er history ber korbo. karon user er history te video er information thakbe. abar oi video er owner er info User collection theke ber korte hobe. so nasted aggregation pipeline use korte hobe.
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
             //mongoose.Types.ObjectId mane examle _id="64b8f8f8f8f8f8f8f8f8f8f"  but mongo db tea objectID('64b8f8f8f8f8f8f8f8f8f8f') format e thake. 
            //so mongoose.Types.ObjectId use kore objectID format e convert korte hobe.
            }
        },
        {
            $lookup: {
                from: "videos", //videos collection theke data niye asbe.
                localField: "watchHistory", //user collection er watchHistory.video field ta use korbe.
                foreignField: "_id", //videos collection er _id field ta use korbe.
                as: "watchHistory",//watchHistory name e array banabe. jekhane oi user er watch history thakbe.
                pipeline: [
                    {
                        $lookup: {
                            from: "users", //users collection theke data niye asbe.
                            localField: "owner", //videos collection er owner field ta use korbe.
                            foreignField: "_id", //users collection er _id field ta use korbe.
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    }
                    ,//array to object
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner" //array theke first element ta ber korbe. karon owner field ta array hisebe asche. so array to object korte hobe.
                            }
                        }
                    }

                ]

            }
        }
    ])

    if (!user || user.length === 0) {
        throw new ApiError(404, "User not found");
    }
  
    return res.status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "User history fetched successfully"));
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
    getUserHistory,
    getUserChannelProfile

}
