import Category from "../../models/categoryModel.js";
import Brand from "../../models/brandModel.js";
import Product from "../../models/productModel.js";

const getProduct = async (req, res) => {
  try {
  
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;


    const search = req.query.search?.trim() || "";
    const isBlocked = req.query.isBlocked?.trim() || "";
    const status = req.query.status?.trim() || "";

    let searchQuery = {};


    if (search) {
      searchQuery.name = { $regex: search, $options: "i" };
    }


    if (req.query.isBlocked) {
      searchQuery.isBlocked = req.query.isBlocked === "true";
    }


    if (status) {
      searchQuery.status = status;
    }

    
    const totalProducts = await Product.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalProducts / limit) || 1;

    
    const products = await Product.find(searchQuery)
      .populate("category", "name")
      .populate("brand", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    
    products.forEach((product) => {
      product.variants = product.variants.map((variant) => ({
        ...variant,
        finalPrice: variant.discountPrice ?? variant.price,
      }));
    });

    
    const categories = await Category.find({ isActive: true }).select("name");
    const brands = await Brand.find({ isActive: true }).select("name");

   
    res.render("admin/products", {
      products,
      categories,
      brands,
      search,
      status,
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
      .populate("category")
      .populate("brand")
      .lean();

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    res.json({ success: true, data: product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};








////////////////////////////////////////////////block/unblock//////////////////////////////////////////////////////////////

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




export default {
  getProduct,
  toggleProductStatus,
  getProductById,
};