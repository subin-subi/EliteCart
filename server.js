import express from "express";
import path from "path";
import { fileURLToPath } from "url"; 
import dotenv from "dotenv";
import session from "express-session";
import connectDB from "./connections/connection.js";
import userRoute from "./Routes/userRoute.js";
import adminRoute from "./Routes/adminRoute.js"
dotenv.config();
connectDB();

const app = express();

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware for parsing requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware

app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict'
    },
    name: 'sessionId'
}));

//cache control
// Cache control middleware
app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    next();
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); 

// Routes
app.use("/", userRoute);
app.use("/admin",adminRoute)
 
// Start Server 
app.listen(3000, () => {
    console.log("Running on http://localhost:3000");
});
