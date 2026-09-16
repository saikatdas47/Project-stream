import mongoose from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar: {
        type: String,
        default: "",
    },
    coverImage: {
        type: String,
        default: "",
    },
    watchHistory:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
        }
    ],
    password: {
        type: String,
        required: [true,"Password is required"],
    },
    refreshToken: {
        type: String,
        default: "",
    },
    
}, { timestamps: true });



// Add the aggregatePaginate plugin to the userSchema
userSchema.plugin(aggregatePaginate);
// Pre-save hook to hash the password before saving the user document. If the password field is not modified, it will skip hashing and proceed to the next middleware.
userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});




userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};




userSchema.methods.generateAccessToken = function () {
    const payload = { 
        _id: this._id,
        username: this.username,
        email: this.email,
        fullname: this.fullname,

     };
    const accessToken = jwt.sign(payload, process.env.AccessTokenSecret, 
    {
        expiresIn: process.env.AccessTokenExpiresIn,
    });
    return accessToken;
};




userSchema.methods.generateRefreshToken = function () {
    const payload = { 
        _id: this._id,
      
     };
    const refreshToken = jwt.sign(payload, process.env.RefreshTokenSecret, 
    {
        expiresIn: process.env.RefreshTokenExpiresIn,
    });
    return refreshToken;
};




const User = mongoose.model("User", userSchema);

export default User;
