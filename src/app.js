import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";



const app = express();

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow cookies to be sent with requests
}));
app.use(cookieParser());


//Routers
import userRouter from "./routes/user.router.js";
app.use("/api/v1/user/",userRouter);

// Return API errors as JSON instead of Express's default HTML error page.
app.use((error, req, res, next) => {
  const statusCode = error?.statusCode || error?.http_code || error?.error?.http_code || 500;
  const message = error?.message || error?.error?.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: error?.errors || [],
  });
});


export default app;
