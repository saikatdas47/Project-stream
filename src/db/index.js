import mongoose from "mongoose";
import { DB_name } from "../constants.js";

const connectDB = async () => {
  try {
   const connection = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: DB_name,
    });
    console.log("MongoDB connected successfully", connection.connection.host);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};

export default connectDB;
