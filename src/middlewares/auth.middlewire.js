import JWT from "jsonwebtoken";
import User from "../models/user.model.js";
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';

 const verifyJWT = asyncHandler(async (req, res, next) => {

    try {
        const token = req.cookies?.accessToken ||
                      req.header("Authorization")?.replace("Bearer ", "");//replace because authorization header is in the format "Bearer <token>" we need to remove the "Bearer " part to get the actual token
        
        
        if (!token) {
            throw new Error("Token not found");
        }

        const decodeToken = JWT.verify(token, process.env.AccessTokenSecret);


        const user = await User.findById(decodeToken._id).select("-password -refreshToken"); // -password -refreshToken mane ei field gulo db theke remove kore pathabo. cz we don't want to send the password and refresh token to the frontend for security reasons.
        if (!user) {
            throw new Error("User not found");
        }

        req.user = user;
        next();
        
    } catch (error) 
    { 
        throw new ApiError(401, error?.message || "Invalid token"); 
    };
});

export default verifyJWT;