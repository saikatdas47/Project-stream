import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import AsyncHandler from '../utils/asyncHandler.js';
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

    const avaterLocalPath = req.files?.avater?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avaterLocalPath) { //avater must be provided but coverImage is optional. so coverimgae should handle null value.
        throw new ApiError(400, "Avatar Image are required");
    }

    //Upload avatar and coverImage to cloudinary
    const avater = await uploadOnCloudinary(avaterLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if(!coverImage){throw new ApiError(400, "Cover Image is required");} //avater er localpath check korsi but cover er kori nai, cz cover optional.

    //Create new user
    const user = await User.create({
        fullName,
        email,
        userName,
        password,
        avatar: avater?.url, //Avatar is required so no need to check for null value but coverImage is optional so we need to check for null value.
        coverImage: coverImage?.url || "",
    });


    //user schema theke refresh token and password  remove kore db tea pathabo
    const createdUser = await User.findById(user._id).select("-password -refreshToken"); //-password -refreshToken mane ei field gulo db theke remove kore pathabo.
    if(!createdUser) {
        throw new ApiError(500, "User not created");
    }

    //Send response to frontend
    res.status(201).json(new ApiResponse(true, 201, "User registered successfully", createdUser));

});


export{
    userRegister
}