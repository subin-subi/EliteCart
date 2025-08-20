import Category from "../../models/categoryModel.js";
import Brand from "../../models/brandModel.js";
import Product from "../../models/productModel.js";
import fs from 'fs';
import path from 'path';

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

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    // Get products with populated category and brand
    const products = await Product.find(searchQuery)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get categories and brands for the form
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














// Add Product - expects Cloudinary URLs populated by multer-storage-cloudinary
const addProduct = async (req, res) => {
  try {
    const { name, category, brand, color, price, stock, description } = req.body;

    // Validate required fields
    if (!name || !category || !brand || !color || !price || !stock || !description) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Handle images
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

    // Create new product
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



// Get product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving product',
      error: error.message
    });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      description,
      price,
      variants
    } = req.body;

    const productId = req.params.id;

    // Validate required fields
    if (!name || !brand || !category || !description || !price) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Parse variants
    let parsedVariants = [];
    if (variants) {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid variants data format'
        });
      }
    }

    // Validate variants
    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one variant is required'
      });
    }

    // Validate each variant
    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      if (!variant.color || !variant.price || variant.price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Variant ${i + 1}: Color and price are required, price must be greater than 0`
        });
      }
    }

    // Get existing product to preserve images if no new ones uploaded
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Process uploaded images
    let mainImage = existingProduct.mainImage;
    let subImages = [...existingProduct.subImages];

    // Check if we should keep existing images
    const keepExistingImages = req.body.keepExistingImages === 'true';
    
    // Check for removed existing images
    let removedExistingImages = [];
    if (req.body.removedExistingImages) {
      try {
        removedExistingImages = JSON.parse(req.body.removedExistingImages);
      } catch (parseError) {
        console.error('Error parsing removed existing images:', parseError);
      }
    }

    if (req.files && req.files.length > 0) {
      // New main image uploaded
      mainImage = `/uploads/products/${req.files[0].filename}`;
      
      // Delete old main image if it exists
      if (existingProduct.mainImage) {
        const oldMainImagePath = path.join(process.cwd(), 'public', existingProduct.mainImage);
        if (fs.existsSync(oldMainImagePath)) {
          fs.unlinkSync(oldMainImagePath);
        }
      }

      // Process new sub images
      const newSubImages = [];
      for (let i = 1; i < Math.min(req.files.length, 4); i++) {
        newSubImages.push(`/uploads/products/${req.files[i].filename}`);
      }

      // If new sub images uploaded, replace old ones
      if (newSubImages.length > 0) {
        // Delete old sub images
        existingProduct.subImages.forEach(imagePath => {
          const fullPath = path.join(process.cwd(), 'public', imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        });
        subImages = newSubImages;
      }
    } else if (keepExistingImages) {
      // Keep existing images - no changes needed
      mainImage = existingProduct.mainImage;
      subImages = existingProduct.subImages;
      
      // Remove any images that were marked for removal
      if (removedExistingImages.length > 0) {
        subImages = subImages.filter(img => !removedExistingImages.includes(img));
        
        // Delete removed images from filesystem
        removedExistingImages.forEach(imagePath => {
          const fullPath = path.join(process.cwd(), 'public', imagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        });
      }
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name: name.trim(),
        brand,
        category,
        price: parseFloat(price),
        description: description.trim(),
        mainImage,
        subImages,
        variants: parsedVariants
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

// Toggle product status (block/unblock)
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

    // Toggle status
    const newStatus = product.status === 'active' ? 'blocked' : 'active';
    product.status = newStatus;
    await product.save();

    res.json({
      success: true,
      message: `Product ${newStatus} successfully`,
      status: newStatus
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

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete associated images
    if (product.mainImage) {
      const mainImagePath = path.join(process.cwd(), 'public', product.mainImage);
      if (fs.existsSync(mainImagePath)) {
        fs.unlinkSync(mainImagePath);
      }
    }

    if (product.subImages && product.subImages.length > 0) {
      product.subImages.forEach(imagePath => {
        const fullPath = path.join(process.cwd(), 'public', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    // Delete product
    await Product.findByIdAndDelete(productId);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// Upload product images
const uploadProductImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: imageUrls
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message
    });
  }
};

// Get products for API (JSON response)
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
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(searchQuery)
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error getting products API:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving products',
      error: error.message
    });
  }
};

export default {
  getProduct,
  addProduct

};