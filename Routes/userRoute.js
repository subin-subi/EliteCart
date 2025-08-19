import { Router } from "express";
import authController from "../controllers/userController/signupController.js"; 
import otpController from "../controllers/userController/otpController.js"
import userMiddleware from "../middleware/userMiddleware.js"
// import productController from "../controllers/userController/productController.js";




const route = Router();

route.get("/check-session",authController.checkSession)

route.get("/signup", userMiddleware.isLogin, authController.getSignUp);

route.post("/signup", authController.postSignup);

route.post("/validate-otp", otpController.validateOTP);

route.post("/resend-otp", otpController.resendOTP);

route.get("/test-otp", otpController.testOTP);

route.get("/debug-otp/:email", otpController.debugOTP)  

route.get('/login', userMiddleware.isLogin, authController.getLogin)

route.post("/login",authController.postLogin)

route.get("/home",  authController.homepage)

route.get("/about", otpController.aboutPage)

route.get('/forgot-password', authController.getForgotPassword)

route.post("/forgot-password/send-otp", otpController.sendForgotPasswordOTP)

route.post("/forgot-password/verify-otp", otpController.verifyForgotPasswordOTP)

route.post("/forgot-password/reset-password",authController.resetPassword)

route.get("/change-password", userMiddleware.checkSession, authController.getChangePassword)

route.post("/change-password", userMiddleware.checkSession, authController.postChangePassword)

route.get("/auth/google", authController.getGoogle)

route.get('/auth/google/callback', authController.getGoogleCallback);

route.post("/logout", authController.getLogout)

////////////product Controller/////////////////////

// route.get("/product",productController.getProductsPage)



export default route;