import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";



const app = express();

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
app.use(cors({
    origin: "http://localhost:3000", // Replace with your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow cookies to be sent with requests
}));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Welcome to the Stremars API!");
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Server is healthy" });
});

export default app;
