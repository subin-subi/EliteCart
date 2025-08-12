import express from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import authController from "../controllers/adminController/signupController.js";
import dashboardController from "../controllers/adminController/dashboardController.js";
import brantController from "../controllers/adminController/brantController.js";
import categoryController from "../controllers/adminController/categoryController.js";
import productController from "../controllers/adminController/productController.js";
import userController from "../controllers/adminController/userController.js"
const router = express.Router();

// Auth Routes
router.get("/login", adminMiddleware.isLogin, authController.getAdmin);
router.post("/login", authController.postAdmin);
router.get("/logout", authController.getLogout);

//Dashboard
router.get("/dashboard", adminMiddleware.checkSession, dashboardController.getDashboard);

// Brand Management
router.get("/brant", brantController.getBrant);
router.post("/add-brant", brantController.addBrant);
router.get("/brant/:id", brantController.getBrantById);
router.put("/edit-brant/:id", brantController.updateBrant);
router.patch("/block-brant/:id", brantController.blockBrant);
router.patch("/unblock-brant/:id", brantController.unblockBrant);

// Category Management
router.get("/category", categoryController.getCategory);
router.post("/add-category", categoryController.addCategory);
router.get("/category/:id", categoryController.getCategoryById);
router.put("/edit-category/:id", categoryController.updateCategory);
router.put("/edit-category", categoryController.editCategory);
router.patch("/block-category/:id", categoryController.blockCategory);
router.patch("/unblock-category/:id", categoryController.unblockCategory);

// Product management
router.get("/products", productController.getProduct);

// User management
router.get("/userlist", userController.getUserList);
router.post("/toggle-block", userController.getToggle);

export default router;