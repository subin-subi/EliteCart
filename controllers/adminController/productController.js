import Category from "../../models/categoryModel.js";
import Brand from "../../models/brandModel.js";
import Product from "../../models/productModel.js";
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';


const getProduct = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const search = req.query.search?.trim() || "";
    const isBlocked = req.query.isBlocked?.trim() || ""; // 👈 use isBlocked now

    let searchQuery = {};

    // Search by name
    if (search) {
      searchQuery.name = { $regex: `^${search}`, $options: "i" };
    }

    if (req.query.isBlocked) {
  searchQuery.isBlocked = req.query.isBlocked === "true"; 
}

    const totalProducts = await Product.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalProducts / limit) || 1;

    const products = await Product.find(searchQuery)
      .populate("category", "name")
      .populate("brand", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const categories = await Category.find({ isActive: true }).select("name");
    const brands = await Brand.find({ isActive: true }).select("name");

    res.render("admin/products", {
      products,
      categories,
      brands,
      search,
      isBlocked, 
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    });
  } catch (error) {
    console.error("Error loading product page:", error);
    res.status(500).send("Internal Server Error");
  }
};





const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name")
      .populate("brand", "name");

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error fetching product" });
  }
};

// Update product
 const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id; 
    const { name, brand, category, color, price, stock, description } = req.body;

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let mainImage = existingProduct.mainImage;
    let subImages = [...existingProduct.subImages];

    // Replace main image if uploaded
    if (req.files?.mainImage?.[0]) {
      mainImage = req.files.mainImage[0].path;
    }

    // Replace/add sub images if uploaded
    if (req.files?.subImages?.length > 0) {
      subImages = req.files.subImages.map(f => f.path);
    }

    // Ensure exactly 3 subImages
    if (subImages.length !== 3) {
      return res
        .status(400)
        .json({ success: false, message: "Exactly 3 sub images are required" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name,
        brand,
        category,
        color,
        price,
        stock,
        description,
        mainImage,
        subImages,
      },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: "Product updated successfully", product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ success: false, message: "Error updating product" });
  }
};


////////////////////////////////////////////////block/unblock//////////////////////////////////////////////////////////////
// Toggle product isBlocked (block/unblock)
const toggleProductStatus = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isBlocked = !product.isBlocked;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      isBlocked: product.isBlocked
    });
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product status',
      error: error.message
    });
  }
};


// ////////////////////////////////////////////////searching//////////////////////////////////////////////////////////////
function escapeRegex(text = "") {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}



const getProductsAPI = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let searchQuery = {};
    if (search) {
      const safeSearch = escapeRegex(search); 
      searchQuery.name = { $regex: `^${safeSearch}`, $options: 'i' };
    }


    if (status && status !== 'All Status') {
      searchQuery.status = status;
    }

    const totalProducts = await Product.countDocuments(searchQuery);
    const products = await Product.find(searchQuery)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ success: true, products, totalProducts });
  } catch (error) {
    console.error('Error getting products API:', error);
    res.status(500).json({ success: false, message: 'Error retrieving products' });
  }
};

////////////////////////////////////////////////edit//////////////////////////////////////////////////////////////


export default {
  getProduct,
  updateProduct,
  toggleProductStatus,
  getProductsAPI,
  getProductById,
};