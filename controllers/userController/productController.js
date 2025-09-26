import Product from "../../models/productModel.js";
import Brand from "../../models/brandModel.js";
import Category from "../../models/categoryModel.js";




const getProductsPage = async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, stock, search, page, sort } = req.query;

    // Base filter
    const filter = { isBlocked: { $ne: true } };

    if (category && category !== 'all') filter.category = category;
    if (brand && brand !== 'all') filter.brand = brand;
    if (search && search.trim()) filter.name = { $regex: search.trim(), $options: 'i' };

    // Pagination
    const currentPage = Math.max(parseInt(page || '1', 10), 1);
    const limit = 12;
    const skip = (currentPage - 1) * limit;

    // Variant filters
    const variantFilter = {};
    if (minPrice) variantFilter.price = { ...variantFilter.price, $gte: Number(minPrice) };
    if (maxPrice) variantFilter.price = { ...variantFilter.price, $lte: Number(maxPrice) };
    if (stock === 'inStock') variantFilter.stock = { $gt: 0 };
    else if (stock === 'outOfStock') variantFilter.stock = { $lte: 0 };

    // Sorting
    let sortOption = {};
    if (sort === 'priceLowToHigh') sortOption = { 'variants.price': 1 };
    else if (sort === 'priceHighToLow') sortOption = { 'variants.price': -1 };
    else if (sort === 'az') sortOption = { name: 1 };
    else if (sort === 'za') sortOption = { name: -1 };
    else sortOption = { createdAt: -1 }; // default

    let products = await Product.find(filter)
      .populate('category')
      .populate('brand')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    // Apply variant filtering
    products = products.map(product => {
      const filterVariants = product.variants.filter(variant => {
        if (variant.isBlocked) return false;
        if (minPrice && variant.price < Number(minPrice)) return false;
        if (maxPrice && variant.price > Number(maxPrice)) return false;
        if (stock === 'inStock' && variant.stock <= 0) return false;
        if (stock === 'outOfStock' && variant.stock > 0) return false;
        return true;
      });
      return { ...product, variants: filterVariants };
    }).filter(p => p.variants.length > 0);

    // Total count
    const totalProducts = await Product.countDocuments(filter);

    const [categories, brands] = await Promise.all([
      Category.find({ isActive: true, isHidden: false }).sort({ name: 1 }).lean(),
      Brand.find({ isActive: true, isHidden: false }).sort({ name: 1 }).lean()
    ]);

    res.render('user/product', {
      products,
      categories,
      brands,
      filters: { category, brand, minPrice, maxPrice, stock, search, sort },
      pagination: {
        currentPage,
        totalPages: Math.max(Math.ceil(totalProducts / limit), 1),
        totalProducts
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


const getProductDetailPage = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId).lean(); 
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Step 1: Same category
    let relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id }
    })
      .limit(4)
      .lean();

    // Step 2: If not enough from same category, check same brand
    if (relatedProducts.length < 4) {
      const brandProducts = await Product.find({
        brand: product.brand,
        _id: { $ne: product._id, $nin: relatedProducts.map(p => p._id) }
      })
        .limit(4 - relatedProducts.length)
        .lean();

      relatedProducts = [...relatedProducts, ...brandProducts];
    }

    // Step 3: If still not enough, fetch other products
    if (relatedProducts.length < 4) {
      const otherProducts = await Product.find({
        _id: { $ne: product._id, $nin: relatedProducts.map(p => p._id) }
      })
        .limit(4 - relatedProducts.length)
        .lean();

      relatedProducts = [...relatedProducts, ...otherProducts];
    }

    res.render("user/productDetail", {
      product,
      relatedProducts,
    });
  } catch (error) {
    console.error("Error loading product detail:", error);
    res.status(500).send("Server Error");
  }
};

export default {
  getProductsPage,
  searchProductsByName,
  getProductDetailPage
};
