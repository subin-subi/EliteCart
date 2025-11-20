import express from "express";
import path from "path";
import { fileURLToPath } from "url"; 
import dotenv from "dotenv";
import session from "express-session";
import connectDB from "./connections/connection.js";
import userRoute from "./Routes/userRoute.js";
import adminRoute from "./Routes/adminRoute.js"
import MongoStore from "connect-mongo";
import startOfferCron from "./utils/cronjob.js"


startOfferCron()
dotenv.config();
connectDB();

const app = express();


// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware for parsing requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const userSession = session({
  name: "sessionId",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "strict",
  },
});

const adminSession = session({
  name: "adminSessionId",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "adminSessions",
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "strict",
  },
});


// Static files
app.use(express.static(path.join(__dirname, "public")));

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// Admin session FIRST
app.use("/admin", adminSession);
app.use("/admin", adminRoute);

// User session NEXT
app.use(userSession);
app.use("/", userRoute);



app.use((req, res) => {
  res.status(404).render("partials/error", {
    message: "Page not found!"
  });
});


// Start Server 
app.listen(3000, () => {
    console.log("Running on http://localhost:3000");  
});
