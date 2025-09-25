import Product from "../../models/productModel.js";
import Brand from "../../models/brandModel.js";
import Category from "../../models/categoryModel.js";




const getProductsPage = async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, stock, search, page } = req.query;

    // Base filter
    const filter = { isBlocked: { $ne: true } };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (brand && brand !== 'all') {
      filter.brand = brand;
    }

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // Pagination
    const currentPage = Math.max(parseInt(page || '1', 10), 1);
    const limit = 12;
    const skip = (currentPage - 1) * limit;

    // Build variant filters
    const variantFilter = {};
    if (minPrice) variantFilter.price = { ...variantFilter.price, $gte: Number(minPrice) };
    if (maxPrice) variantFilter.price = { ...variantFilter.price, $lte: Number(maxPrice) };

    if (stock === 'inStock') {
      variantFilter.stock = { $gt: 0 };
    } else if (stock === 'outOfStock') {
      variantFilter.stock = { $lte: 0 };
    }

    // Fetch products
    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate('category')
        .populate('brand')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .then(docs => {
          // Filter variants inside each product
          return docs.map(product => {
            const filteredVariants = product.variants.filter(variant => {
              let ok = true;
              if (variantFilter.price) {
                if (variantFilter.price.$gte && variant.price < variantFilter.price.$gte) ok = false;
                if (variantFilter.price.$lte && variant.price > variantFilter.price.$lte) ok = false;
              }
              if (variantFilter.stock) {
                if (variantFilter.stock.$gt !== undefined && variant.stock <= 0) ok = false;
                if (variantFilter.stock.$lte !== undefined && variant.stock > 0) ok = false;
              }
              return ok && !variant.isBlocked;
            });
            return { ...product, variants: filteredVariants };
          }).filter(p => p.variants.length > 0); // Remove products with no matching variants
        }),
      Product.countDocuments(filter),
    ]);

    // Fetch categories and brands
    let categories = [];
    let brands = [];
    try {
      categories = await Category.find({ isActive: true, isHidden: false }).sort({ name: 1 }).lean();
    } catch (categoryError) {
      console.error('Error fetching categories:', categoryError);
    }
    try {
      brands = await Brand.find({ isActive: true, isHidden: false }).sort({ name: 1 }).lean();
    } catch (brandError) {
      console.error('Error fetching brands:', brandError);
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

    // Step 2: If no same-category, check same-brand
    if (relatedProducts.length < 4) {
      relatedProducts = await Product.find({
        brand: product.brand,
        _id: { $ne: product._id ,$nin : relatedProducts.map(p => p._id)}
      })
        .limit(4 - relatedProducts.length)
        .lean();
    }

    // Step 3: If no brand, get any other products
    if (relatedProducts.length === 0) {
     brandProducts = await Product.find({
        _id: { $ne: product._id }
      })
        .limit(8)
        .lean();

        relatedProducts = [...relatedProducts, ...brandProducts]
    }

if(relatedProducts.length < 4){
  const otherProduct = await Product.find({
    _id:{$ne :product._id, $nin: relatedProducts.map(p => p._id)}
})
relatedProducts = [...otherProduct, ...relatedProducts]
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
