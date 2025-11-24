import userModel from "../models/userModel.js";
import Product from "../models/productModel.js";
import mongoose from "mongoose";
import HTTP_STATUS from "./../utils/responseHandler.js";

const checkBlocked = async (req, res, next) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(HTTP_STATUS.NOT_FOUND).render("user/noProduct", {
        message: "Invalid product link. No product found.",
      });
    }

    const product = await Product.findById(productId)
      .populate("category")
      .populate("brand");

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).render("user/noProduct", {
        message: "No product found.",
      });
    }

    if (product.isBlocked) return res.redirect("/");

    const hasBlockedVariant = product.variants.some((v) => v.isBlocked);
    if (hasBlockedVariant) return res.redirect("/");

    if (
      product.category &&
      (!product.category.isActive || product.category.isHidden)
    ) {
      return res.redirect("/");
    }

    if (product.brand && (!product.brand.isActive || product.brand.isHidden)) {
      return res.redirect("/");
    }

    next();
  } catch (error) {
    console.error("Error checking blocked status:", error);
    return res.redirect("/");
  }
};

const checkSession = async (req, res, next) => {
  try {
    if (!req.session || !req.session.user) {
      return next();
    }

    const user = await userModel
      .findById(req.session.user)
      .select("-password")
      .lean();

    if (user && user.blocked) {
      req.session.destroy(() => {});
      return res.redirect("/login?message=Account+blocked");
    }

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    console.error("Session Check Error:", error);
    return res.redirect("/login?message=Server+error");
  }
};

const isLogin = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login?msg=please_login");
    }
    next();
  } catch (error) {
    console.error("Login Check Error:", error);
    next();
  }
};

const noCache = (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
};

const requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login?message=Please+login+first");
  }
  next();
};



//  1. Check if user is logged in and not blocked
const isUserLoggedIn = async (req, res, next) => {
  try {
    if (req.session.user) { 
     res.redirect(req.get("Referer") || "/");
    } else {
      next()
    }
    

  } catch (err) {
    console.error("Auth middleware error:", err);
    res.redirect("/login");
  }
};

//  2. Restrict access to login/signup pages if already logged in
const isUserLoggedOut = (req, res, next) => {
  if (!req.session || !req.session.isLoggedIn) {
    return next();
  }
  res.redirect("/home");
};

export default {
  isLogin,
  checkSession,
  noCache,
  requireLogin,
  checkBlocked,
  
  isUserLoggedIn,
  isUserLoggedOut,
};
