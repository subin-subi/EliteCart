import { Router } from "express";
import authController from "../controllers/userController/signupController.js"; 
import otpController from "../controllers/userController/otpController.js"
import userMiddleware from "../middleware/userMiddleware.js"
import productController from "../controllers/userController/productController.js";
import profileController from "../controllers/userController/personalDetailController.js"
import passwordController from "../controllers/userController/passwordController.js";
import addressController from "../controllers/userController/addressController.js"
import cartController from "../controllers/userController/cartController.js";
import checkoutController from "../controllers/userController/checkoutController.js";
import wishlistController from "../controllers/userController/wishlistController.js";


const route = Router();

route.get("/check-session",authController.checkSession)

route.get("/signup", authController.getSignUp);

route.post("/signup", authController.postSignup);

route.post("/validate-otp", otpController.validateOTP);

route.post("/resend-otp", otpController.resendOTP);

route.get("/test-otp", otpController.testOTP);

route.get("/debug-otp/:email", otpController.debugOTP)  

route.get('/login', authController.getLogin)

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

route.get("/product",userMiddleware.isLogin,productController.getProductsPage)
route.get("/search-products",userMiddleware.checkBlocked,productController.searchProduct)

route.get("/productDetail/:id",userMiddleware.checkBlocked, productController.getProductDetailPage)
route.post("/wishlist/add",productController.addToWishlist)



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
route.patch("/edit-Address/:id", addressController.editAddress)




route.get("/cart" ,userMiddleware.isLogin, cartController.getCart)
route.post("/cart/add", cartController.addToCart);
route.patch("/cart/update-quantity/:itemId", cartController.updateQuantity )
route.delete("/cart/remove/:itemId",cartController.removeProduct)


route.get("/checkout", checkoutController.getSingleCheckout);
route.get("/checkout/cart", checkoutController.getCartCheckout)


route.get("/wishlist",wishlistController.getWishlist)
route.post("/cart/add-to-wish",wishlistController.addToCartFromWishlist)
route.post("/wishlist/remove/:productId",wishlistController.removeWishlist)



export default route;