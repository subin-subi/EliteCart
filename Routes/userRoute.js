import { Router } from "express";
import authController from "../controllers/userController/signupController.js"; 
import otpController from "../controllers/userController/otpController.js"
import userMiddleware from "../middleware/userMiddleware.js"
import productController from "../controllers/userController/productController.js";
import profileController from "../controllers/userController/personalDetailController.js"
import passwordController from "../controllers/userController/passwordController.js";
import addressController from "../controllers/userController/addressController.js"

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

route.get("/",userMiddleware.checkSession, authController.homepage)


route.get('/forgot-password', authController.getForgotPassword)

route.post("/forgot-password/send-otp", otpController.sendForgotPasswordOTP)

route.post("/forgot-password/verify-otp", otpController.verifyForgotPasswordOTP)

route.post("/forgot-password/reset-password",authController.resetPassword)

route.get("/auth/google", authController.getGoogle)

route.get('/auth/google/callback', authController.getGoogleCallback);

route.post("/logout", authController.getLogout)

////////////product Controller/////////////////////

route.get("/product",userMiddleware.checkSession,productController.getProductsPage)
route.get("/search-products",userMiddleware.checkSession,productController.searchProduct)

route.get("/productDetail/:id",userMiddleware.checkBlocked, productController.getProductDetailPage)

route.get("/profile" , profileController.getProfile)
route.post("/profile",profileController.editDetail)

route.post("/sendotp", profileController.sendOtp)
route.post("/validateOtp", profileController.verifyOtp)

route.post("/resendOtp",profileController.resendOtp)



route.get("/change-password", passwordController.getPage)
route.post("/changePassword",passwordController.changePassword)

route.get("/address", addressController.getAddress)
route.post("/add-Address", addressController.saveAddress)
route.post("/set-default-address/:id", addressController.setDefaultAddress)
route.patch("/block-address/:id", addressController.blockAddress);
route.patch("/unblock-address/:id",addressController.unblockAddress );

export default route;