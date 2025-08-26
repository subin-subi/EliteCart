import Product from "../../models/productModel.js";
import Brand from "../../models/brandModel.js";
import Category from "../../models/categoryModel.js";




const getProductsPage = async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, stock, search, page } = req.query;

    const filter = { isBlocked: { $ne: true } };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (stock === 'inStock') {
      filter.stock = { $gt: 0 };
    } else if (stock === 'outOfStock') {
      filter.stock = { $lte: 0 };
    }

    if (brand && brand !== 'all') {
      filter.brand = brand;
    }

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }
    const currentPage = Math.max(parseInt(page || '1', 10), 1);
    const limit = 12;
    const skip = (currentPage - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate('category')
        .populate('brand')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    let categories = [];
    let brands = [];
    try {
      categories = await Category.find({ isActive: true, isHidden: false }).sort({ name: 1 }).lean();
    } catch (categoryError) {
      console.error('Error fetching categories:', categoryError);
      categories = [];
    }
    try {
      brands = await Brand.find({ isActive: true, isHidden: false }).sort({ name: 1 }).lean();
    } catch (brandError) {
      console.error('Error fetching brands:', brandError);
      brands = [];
    }

    res.render('user/product', {
      products,
      categories,
      brands,
      filters: { 
        category: category || '',
        brand: brand || '',
        minPrice: minPrice || '',
        maxPrice: maxPrice || '',
        stock: stock || '',
        search: search || '',
      },
      pagination: {
        currentPage,
        totalPages: Math.max(Math.ceil(totalProducts / limit), 1),
        totalProducts,
      }
    });
  } catch (error) {
    console.error('Error loading products page:', error);
    res.status(500).send('Server Error');
  }
};

// Live search by product name (case-insensitive)
const searchProductsByName = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ success: true, results: [] });
    const results = await Product.find({ name: { $regex: q, $options: 'i' } })
      .select('name _id')
      .limit(10);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

export default {
  getProductsPage,
  searchProductsByName,
};
