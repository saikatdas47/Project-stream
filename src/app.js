import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";



const app = express();

//Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "http://localhost:3000", // Replace with frontend URL
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


/*
Frontend request
      ↓
JSON / form data পড়া
      ↓
CORS permission check
      ↓
Cookie পড়া
      ↓
User router
      ↓
Error হলে JSON error response


১. Express app তৈরি
const app = express();
express() দিয়ে Express application তৈরি করা হয়েছে।
এই app-এর মাধ্যমেই আমরা:
- middleware ব্যবহার করি
- API route তৈরি করি
- server চালু করি
- request ও response handle করি
সহজ ভাষায়, app হচ্ছে তোমার backend application-এর মূল controller।


২. JSON data পড়া
app.use(express.json());
Frontend যদি JSON format-এ data পাঠায়:
{
  "name": "Saikat",
  "email": "saikat@example.com"
}
তাহলে express.json() সেই data পড়তে সাহায্য করে। এরপর controller-এ পাওয়া যায়:
req.body.name;
req.body.email;
এটি ব্যবহার না করলে অনেক ক্ষেত্রে req.body হবে undefined।
app.use() মানে হলো:
প্রতিটি relevant request-এর ক্ষেত্রে এই middleware-টি ব্যবহার করো।

৩. Form data পড়া
app.use(express.urlencoded({ extended: true }));
HTML form থেকে আসা URL-encoded data পড়ার জন্য এটি ব্যবহার করা হয়।
ধরো, এমন data এসেছে:
name=Saikat&city=Dhaka
Middleware সেটি JavaScript object বানিয়ে দেয়:
{
  name: "Saikat",
  city: "Dhaka"
}
তারপর এটি পাওয়া যাবে:
req.body;
extended: true দেওয়ায় nested object-এর মতো complex form data-ও parse করা যায়।


৪. CORS configuration
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
CORS-এর পূর্ণ অর্থ হলো Cross-Origin Resource Sharing।
ধরো:
- Frontend চলছে: http://localhost:3000
- Backend চলছে: http://localhost:5000
দুটি আলাদা origin। Browser নিরাপত্তার জন্য frontend-কে সরাসরি backend access করতে বাধা দিতে পারে। CORS ব্যবহার করে backend বলে:
localhost:3000 থেকে আসা request আমি গ্রহণ করব।

methods
methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
Frontend কোন ধরনের HTTP request পাঠাতে পারবে তা বলে।
- GET → data আনা
- POST → নতুন data তৈরি
- PUT → পুরো data update
- PATCH → data-এর নির্দিষ্ট অংশ update
- DELETE → data delete

allowedHeaders
allowedHeaders: ["Content-Type", "Authorization"]
Frontend কোন headers পাঠাতে পারবে তা নির্ধারণ করে।
Content-Type বলে request-এর data কোন format-এ আছে:
Content-Type: application/json
Authorization সাধারণত access token পাঠানোর জন্য ব্যবহৃত হয়:
Authorization: Bearer access-token

credentials
credentials: true
Frontend এবং backend-এর মধ্যে cookie বা authentication credentials পাঠানোর অনুমতি দেয়।
Frontend থেকেও সাধারণত credentials enable করতে হয়:
fetch("http://localhost:5000/api/v1/user/profile", {
  credentials: "include",
});
Axios হলে:
axios.get("http://localhost:5000/api/v1/user/profile", {
  withCredentials: true,
});



৫. Cookie পড়া
app.use(cookieParser());
Browser থেকে request-এর সঙ্গে আসা cookie parse করে।
ধরো cookie-তে token আছে:
accessToken=abc123
cookieParser() ব্যবহারের পরে backend থেকে পাওয়া যাবে:
req.cookies.accessToken;
এটি authentication-এর ক্ষেত্রে কাজে লাগে।




৮. Global error-handling middleware
app.use((error, req, res, next) => {
  const statusCode =
    error?.statusCode ||
    error?.http_code ||
    error?.error?.http_code ||
    500;

  const message =
    error?.message ||
    error?.error?.message ||
    "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    errors: error?.errors || [],
  });
});
কোন route বা controller-এ error হলে এই middleware response পাঠাবে।
Error-handling middleware-এর চারটি parameter থাকে:
(error, req, res, next)
- error → কী error হয়েছে
- req → client-এর request
- res → client-কে response পাঠানোর object
- next → পরের middleware-এ যাওয়ার function
Status code নির্বাচন
const statusCode =
  error?.statusCode ||
  error?.http_code ||
  error?.error?.http_code ||
  500;
এখানে একের পর এক সম্ভাব্য জায়গায় status code খোঁজা হচ্ছে।
যদি পাওয়া না যায়, তাহলে:
500
ব্যবহার হবে। 500 মানে server-এর ভেতরে unexpected error হয়েছে।
?. হলো optional chaining। যেমন:
error?.error?.http_code
এর মানে হলো:
error ও error.error থাকলে http_code পড়ো; না থাকলে crash না করে undefined দাও।

Error message নির্বাচন
const message =
  error?.message ||
  error?.error?.message ||
  "Internal server error";
Error-এর message থাকলে সেটি ব্যবহার করবে। না থাকলে সাধারণ message দেবে।
JSON response
res.status(statusCode).json({
  success: false,
  message,
  errors: error?.errors || [],
});
Client এমন response পাবে:
{
  "success": false,
  "message": "User not found",
  "errors": []
}
এ কারণে frontend সহজে বুঝতে পারে request সফল হয়নি।
Error middleware সবশেষে কেন?
Express middleware ওপর থেকে নিচে চলে। তাই error middleware router-এর পরে রাখা হয়:
app.use("/api/v1/user", userRouter);

// সবশেষে
app.use(errorHandler);
Router বা controller-এর ভেতরে error পাঠানো হলে:
next(error);
Express নিচে থাকা error middleware-এ চলে যাবে।
উদাহরণ:
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};
next(error) error-টিকে global error handler-এর কাছে পাঠায়।

*/