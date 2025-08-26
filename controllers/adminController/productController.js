import Category from "../../models/categoryModel.js";
import Brand from "../../models/brandModel.js";
import Product from "../../models/productModel.js";
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Get all products with pagination and search
const getProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    // Build search query
    let searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'All Status') {
      searchQuery.status = status;
    }

   
    const totalProducts = await Product.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    
    const products = await Product.find(searchQuery)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    
    const categories = await Category.find({ isActive: true });
    const brands = await Brand.find({ isActive: true });

    res.render('admin/products', {
      products,
      categories,
      brands,
      search,
      status,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      }
    });
  } catch (error) {
    console.error("Error loading product page:", error);
    res.status(500).send("Internal Server Error");
  }
};



const addProduct = async (req, res) => {
  try {
    const { name, category, brand, color, price, stock, description } = req.body;

    
    if (!name || !category || !brand || !color || !price || !stock || !description) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    
    let mainImage = "";
    let subImages = [];
    if (req.files) {
      if (req.files.mainImage?.[0]) {
        mainImage = req.files.mainImage[0].path || req.files.mainImage[0].secure_url;
      }
      if (Array.isArray(req.files.subImages)) {
        subImages = req.files.subImages.map((file) => file.path || file.secure_url);
      }
    }

    if (!mainImage) {
      return res.status(400).json({ success: false, message: "Main image is required" });
    }

    if (!Array.isArray(subImages) || subImages.length !== 3) {
      return res.status(400).json({ success: false, message: "Exactly 3 sub images are required" });
    }

    const newProduct = new Product({
      name,
      category,
      brand,
      color,
      price: Number(price),
      stock: Number(stock),
      description,
      mainImage,
      subImages,
    });

    await newProduct.save();

    if (req.headers['x-requested-with'] !== 'XMLHttpRequest' && 
        (!req.headers.accept || !req.headers.accept.includes('application/json'))) {
      return res.redirect('/admin/products');
    }

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
////////////////////////////////////////////////edit//////////////////////////////////////////////////////////////

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("brand");

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Server error" });
  }
};




const updateProduct = async (req, res) => {
  try {
    const { name, brand, category, description, price, stock } = req.body;

    const productId = req.params.id;

    if (!name || !brand || !category || !description || !price || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }


    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    
    let mainImage = existingProduct.mainImage;
    let subImages = [...existingProduct.subImages];

    
    let removedExistingImages = [];
    if (req.body.removedImages) {
      try {
        removedExistingImages = JSON.parse(req.body.removedImages);
      } catch (parseError) {
        console.error('Error parsing removed existing images:', parseError);
      }
    }

    // Handle main image replacement
    if (req.files?.mainImage?.[0]) {
      const oldPublicId = extractPublicIdFromUrl(existingProduct.mainImage || "");
      if (oldPublicId) {
        try { await cloudinary.uploader.destroy(oldPublicId); } catch (e) { console.warn('Failed to destroy old main image:', e?.message); }
      }
      mainImage = req.files.mainImage[0].path || req.files.mainImage[0].secure_url;
    }

    // Remove any existing sub images that were marked for removal
    if (removedExistingImages.length > 0) {
      for (const url of removedExistingImages) {
        const pubId = extractPublicIdFromUrl(url);
        if (pubId) {
          try { await cloudinary.uploader.destroy(pubId); } catch (e) { console.warn('Failed to destroy sub image:', e?.message); }
        }
      }
      subImages = subImages.filter(url => !removedExistingImages.includes(url));
    }

    // Add new sub images if uploaded
    if (Array.isArray(req.files?.subImages) && req.files.subImages.length > 0) {
      const newUrls = req.files.subImages.map(f => f.path || f.secure_url);
      subImages = [...subImages, ...newUrls];
    }

    // Enforce exactly 3 sub images after edit
    if (subImages.length !== 3) {
      return res.status(400).json({ success: false, message: 'Exactly 3 sub images are required after update' });
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name: name.trim(),
        brand,
        category,
        price: parseFloat(price),
        stock: Number(stock),
        description: description.trim(),
        mainImage,
        subImages,
      },
      { new: true, runValidators: true }
    ).populate('category', 'name').populate('brand', 'name');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
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


////////////////////////////////////////////////searching//////////////////////////////////////////////////////////////

const getProductsAPI = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';

    let searchQuery = {};
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
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
  addProduct,
  updateProduct,
  toggleProductStatus,
  getProductsAPI,
  getProductById,
};