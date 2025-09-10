import express from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import authController from "../controllers/adminController/signupController.js";
import dashboardController from "../controllers/adminController/dashboardController.js";
import brandController from "../controllers/adminController/brandController.js";
import categoryController from "../controllers/adminController/categoryController.js";
import userController from "../controllers/adminController/userController.js";
import productController from "../controllers/adminController/productController.js";
import { upload, handleMulterError } from "../utils/multer.js";

const router = express.Router();

// Auth Routes
router.get("/login", adminMiddleware.isLogin, authController.getAdmin);
router.post("/login", authController.postAdmin);
router.get("/logout", authController.getLogout);

//Dashboard
router.get("/dashboard", adminMiddleware.checkSession, dashboardController.getDashboard);

// Brand Management
router.get("/brand", brandController.getBrand);
router.post("/add-brand", brandController.addBrand);
router.get("/brand/:id", brandController.getBrandById);
router.put("/edit-brand/:id", brandController.updateBrand);
router.patch("/block-brand/:id", brandController.blockBrand);
router.patch("/unblock-brand/:id", brandController.unblockBrand);

// Category Management
router.get("/category", categoryController.getCategory);
router.post("/add-category", categoryController.addCategory);
router.get("/category/:id", categoryController.getCategoryById);
router.put("/edit-category/:id", categoryController.updateCategory);
router.put("/edit-category", categoryController.editCategory);
router.patch("/block-category/:id", categoryController.blockCategory);
router.patch("/unblock-category/:id", categoryController.unblockCategory);

// User management
router.get("/userlist", adminMiddleware.checkSession, userController.getUserList);
router.patch("/block-user/:id", adminMiddleware.checkSession, userController.blockUser);
router.patch("/unblock-user/:id", adminMiddleware.checkSession, userController.unblockUser);







router.get("/products", productController.getProduct);
router.post("/addProduct",upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "subImages", maxCount: 3 }
  ]),
  handleMulterError, productController.addProduct)
router.patch("/products/:id/toggle-block", productController.toggleProductStatus);
router.get("/product/:id", productController.getProductById);


router.post("/products/:id", upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "subImages", maxCount: 3 }
]), handleMulterError, productController.updateProduct);


router.get("/api/products", productController.getProductsAPI);


export default router;