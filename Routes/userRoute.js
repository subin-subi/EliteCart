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
import orderDetailController from "../controllers/userController/orderDetailController.js"
import walletController from "../controllers/userController/walletController.js";
import pdfController from "../controllers/userController/pdfController.js"
import redeemController from "../controllers/userController/redeemController.js";
import razorpayController from "../controllers/userController/razorpayController.js";
import paymentController from "../controllers/userController/paymentController.js";

const route = Router();

route.get("/check-session",authController.checkSession)

route.get("/get-user-profile", authController.getProfileImg)

route.get("/signup",userMiddleware.noCache, authController.getSignUp);

route.post("/signup", authController.postSignup);

route.post("/validate-otp", otpController.validateOTP);

route.post("/resend-otp", otpController.resendOTP);

route.get("/test-otp",userMiddleware.noCache, otpController.testOTP);

route.get("/debug-otp/:email",userMiddleware.noCache, otpController.debugOTP)  

route.get('/login',userMiddleware.noCache, authController.getLogin)

route.post("/login",authController.postLogin)

route.get("/",userMiddleware.checkSession, authController.homepage)


route.get('/forgot-password',userMiddleware.noCache, authController.getForgotPassword)

route.post("/forgot-password/send-otp", otpController.sendForgotPasswordOTP)

route.post("/forgot-password/verify-otp", otpController.verifyForgotPasswordOTP)

route.post("/forgot-password/reset-password",authController.resetPassword)

route.get("/auth/google",userMiddleware.noCache, authController.getGoogle)

route.get('/auth/google/callback',userMiddleware.noCache,  authController.getGoogleCallback);

route.post("/logout", authController.getLogout)

////////////product Controller/////////////////////

route.get("/product",productController.getProductsPage)
route.get("/search-products",userMiddleware.checkBlocked,productController.searchProduct)
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
route.patch("/edit-Address/:id", addressController.editAddress)




route.get("/cart" ,userMiddleware.isLogin, cartController.getCart)
route.post("/cart/add", cartController.addToCart);
route.patch("/cart/update-quantity/:itemId", cartController.updateQuantity )
route.delete("/cart/remove/:itemId",cartController.removeProduct)




route.get("/checkout/cart", checkoutController.getCartCheckout)
route.post('/select-address',checkoutController.selectAddres)

route.get("/payment-failed/:id", checkoutController.getPaymentFailPage);
route.patch("/payment-failed/:id", checkoutController.paymentFailed)
route.get("/order-status/:id",checkoutController.userOrderSuccessPage)
route.post("/coupon/apply",checkoutController.addCoupon)

route.post("/create-razorpay-order", razorpayController.createRazorpayOrderHandler)
route.post("/verify-razorpay-payment", razorpayController.verifyRazorpayPayment)
route.post("/retry-payment/:id",razorpayController.retryPayment)




route.post("/checkout/order-cod",paymentController.userOrderCOD)
route.post("/wallet-payment", paymentController.walletPayment)
route.get("/wallet",walletController.getWallet)

route.get("/wishlist",userMiddleware.isLogin,wishlistController.getWishlist)
route.post("/wishlist/add",productController.addToWishlist)
route.post("/cart/add-to-wish",wishlistController.addToCartFromWishlist)
route.post("/wishlist/remove/:productId",wishlistController.removeWishlist)
route.get('/get-counts',wishlistController.notificationCount)

route.get("/orders",orderDetailController.getOrderDetail)
route.post("/order-cancel/:orderId",orderDetailController.cancelFullOrder)
route.post("/item-cancel/:orderId/:itemId",orderDetailController.cancelIndividualItem)
route.post("/order-return/:orderId/:itemId",orderDetailController.requestReturnItem)



route.get("/invoice/:orderId", pdfController.generateInvoice);


route.get("/redeem", redeemController.getRedeem)

export default route;