import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import {ApiError} from '../utils/apiError.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import {ApiResponse} from '../utils/apiResponse.js';



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
    if(!createdUser) {
        throw new ApiError(500, "User not created");
    }

    //Send response to frontend
    res.status(201).json(new ApiResponse(201, "User registered successfully", createdUser));

});


export{
    userRegister
}
