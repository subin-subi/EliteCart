import express from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import authController from "../controllers/adminController/signupController.js";
import dashboardController from "../controllers/adminController/dashboardController.js";
import brandController from "../controllers/adminController/brandController.js";
import categoryController from "../controllers/adminController/categoryController.js";
import userController from "../controllers/adminController/userController.js";
import productController from "../controllers/adminController/productController.js";
import addproductController from "../controllers/adminController/addproductController.js";
import orderController from "../controllers/adminController/orderController.js";
import couponController from "../controllers/adminController/couponController.js"
import offerController from "../controllers/adminController/offerController.js"
import salesReportController from "../controllers/adminController/salesReportController.js";


const router = express.Router();

// Auth Routes
router.get("/login", adminMiddleware.isLogin, authController.getAdmin);
router.post("/login", authController.postAdmin);
router.get("/logout",adminMiddleware.checkSession, authController.getLogout);

//Dashboard
router.get("/dashboard",adminMiddleware.checkSession, dashboardController.getDashboard);

// Brand Management
router.get("/brand",adminMiddleware.checkSession, brandController.getBrand);
router.post("/add-brand", brandController.addBrand);
router.get("/brand/:id",adminMiddleware.checkSession, brandController.getBrandById);
router.put("/edit-brand/:id", brandController.updateBrand);
router.patch("/block-brand/:id", brandController.blockBrand);
router.patch("/unblock-brand/:id", brandController.unblockBrand);

// Category Management
router.get("/category",adminMiddleware.checkSession, categoryController.getCategory);
router.post("/add-category", categoryController.addCategory);
router.get("/category/:id",adminMiddleware.checkSession, categoryController.getCategoryById);
router.put("/edit-category/:id", categoryController.updateCategory);
router.patch("/block-category/:id", categoryController.blockCategory);
router.patch("/unblock-category/:id", categoryController.unblockCategory);

// User management
router.get("/userlist", adminMiddleware.checkSession, userController.getUserList);
router.patch("/block-user/:id", adminMiddleware.checkSession, userController.blockUser);
router.patch("/unblock-user/:id", adminMiddleware.checkSession, userController.unblockUser);

router.get("/orders",adminMiddleware.checkSession,orderController.getAdminOrders)
router.get("/orders/:id",adminMiddleware.checkSession,orderController.getOrderdetail)
router.post("/orders/update-status/:orderId", orderController.updateOrderStatus);
router.post("/update-return-status",orderController.updateReturnStatus)




 router.get("/products",adminMiddleware.checkSession, productController.getProduct);
router.patch("/products/:id/toggle-block", productController.toggleProductStatus);
router.get("/product/:id",adminMiddleware.checkSession, productController.getProductById);




router.get("/addProduct",adminMiddleware.checkSession,addproductController.getaddProductPage)
router.post("/addProduct", addproductController.addProduct)
router.get("/editProduct/:id",adminMiddleware.checkSession,addproductController.getEditPage)
router.post("/editProduct/:id",addproductController.editProduct)
router.post("/addNewVariants/:id",addproductController.addNewVariants)




router.get("/coupon",adminMiddleware.checkSession, couponController.getCouponPage)
router.post("/add-coupon", couponController.addCoupon)
router.put("/coupons/toggle-status",couponController.toggleCouponStatus)
router.post("/edit-coupon/:couponId",couponController.editCoupon)


router.get("/offer",adminMiddleware.checkSession,offerController.getOfferPage)
router.post("/add-offer",offerController.addOffer)
router.post('/offer/toggle-status',offerController.toggleOffer)
router.post("/edit-offer",offerController.editOffer)




router.get("/salesreport",adminMiddleware.checkSession, salesReportController.getSalesReport)
router.get("/salesreport/download/pdf",adminMiddleware.checkSession, salesReportController.downloadSalesReportPdf)
router.get("/salesreport/download/excel",adminMiddleware.checkSession, salesReportController.downloadSalesReportExcel)

export default router;