import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import connectDB from "./db/index.js";
import express from "express";

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB();

// Middleware to parse JSON requests
app.use(express.json());

// Define a simple route for testing
app.get("/", (req, res) => {
  res.send("Hello, World!");
});
app.get("/test", (req, res) => {
  res.send("Hello, test!");
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
