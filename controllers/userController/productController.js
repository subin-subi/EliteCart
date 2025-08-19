import Product from "../../models/productModel.js";
import Brand from "../../models/brandModel.js";
import Category from "../../models/categoryModel.js";
import { upload, storage, handleMulterError } from "../../utils/multer.js";
import fs from 'fs';




const getProductsPage = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, stock } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter['variants.price'] = {};
      if (minPrice) filter['variants.price'].$gte = parseFloat(minPrice);
      if (maxPrice) filter['variants.price'].$lte = parseFloat(maxPrice);
    }
    
    // Stock filter
    if (stock === 'inStock') {
      filter['variants.stock'] = { $gt: 0 };
    } else if (stock === 'outOfStock') {
      filter['variants.stock'] = { $lte: 0 };
    }

    // Fetch products with filters and populate variants
    const products = await Product.find(filter)
      .populate({
        path: "variants",
        match: { isBlocked: false } // Only show non-blocked variants
      })
      .populate("category")
      .sort({ createdAt: -1 });

    // Filter out products with no variants
    const filteredProducts = products.filter(product => 
      product.variants && product.variants.length > 0
    );

    // Fetch all categories for filter dropdown - with error handling
    let categories = [];
    try {
      categories = await Category.find({ status: "active" }).sort({ name: 1 });
    } catch (categoryError) {
      console.error("Error fetching categories:", categoryError);
      categories = []; // Set empty array if categories fail to load
    }

    res.render("user/product", { 
      products: filteredProducts, 
      categories,
      filters: { category, minPrice, maxPrice, stock }
    });
  } catch (error) {
    console.error("Error loading products page:", error);
    res.status(500).send("Server Error");
  }
};

export default { getProductsPage,
  getProductById,
  getProductByCategory,
  getProductByBrand,
  getProductByPrice,
  getProductByStock,
  getProductByColor,
  getProductBySize,
 };
