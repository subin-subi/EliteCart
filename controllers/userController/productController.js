import Product from "../../models/productModel.js";
import Brand from "../../models/brandModel.js";
import Category from "../../models/categoryModel.js";
import Wishlist from "../../models/wishlistModel.js";


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

    // Sorting
    let sortOption = {};
    if (sort === 'priceLowToHigh') sortOption = { 'variants.price': 1 };
    else if (sort === 'priceHighToLow') sortOption = { 'variants.price': -1 };
    else if (sort === 'az') sortOption = { name: 1 };
    else if (sort === 'za') sortOption = { name: -1 };
    else sortOption = { createdAt: -1 }; 
    // Fetch products
   let products = await Product.find(filter)
      .populate({
        path: 'category',
        match: { isActive: true, isHidden: false } 
      })
      .populate({
        path: 'brand',
        match: { isActive: true, isHidden: false } 
      })
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();
    
 products = products.filter(product => product.category && product.brand);

    products = products.map(product => {
      const validVariants = product.variants.filter(v => {
        if (v.isBlocked) return false;
        if (minPrice && v.price < Number(minPrice)) return false;
        if (maxPrice && v.price > Number(maxPrice)) return false;
        if (stock === 'inStock' && v.stock <= 0) return false;
        if (stock === 'outOfStock' && v.stock > 0) return false;
        return true;
      });

      if (validVariants.length === 0) return null;

      let selectedVariant;
      if (sort === 'priceLowToHigh') {
        selectedVariant = validVariants.reduce((prev, curr) => prev.price < curr.price ? prev : curr);
      } else if (sort === 'priceHighToLow') {
        selectedVariant = validVariants.reduce((prev, curr) => prev.price > curr.price ? prev : curr);
      } else {
        selectedVariant = validVariants[0]; 
      }

      return { ...product, variants: [selectedVariant] };
    }).filter(p => p !== null);


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



 const searchProduct = async (req, res) => {
    const { query } = req.query;

    if (!query || query.trim() === "") {
        return res.redirect("/product"); // If no query, show all products
    }

    try {
        const products = await Product.find({
            name: { $regex: '^' + query.trim(), $options: 'i' },
            isBlocked: { $ne: true }
        })
        .populate('category')
        .populate('brand')
        .lean();

        res.render("user/product", {
            products,
            categories: await Category.find({ isActive: true, isHidden: false }).lean(),
            brands: await Brand.find({ isActive: true, isHidden: false }).lean(),
            filters: { search: query },
            pagination: { currentPage: 1, totalPages: 1, totalProducts: products.length }
        });
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).send("Server Error");
    }
}




const getProductDetailPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.id;

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Check if product is in user's wishlist
    let isInWishlist = false;
    if (userId) {
      const wishlist = await Wishlist.findOne({ userId }).lean();
      if (wishlist) {
        isInWishlist = wishlist.items.some(
          (item) => item.productId.toString() === productId
        );
      }
    }

    // Merge the wishlist info into product
    product.isInWishlist = isInWishlist;

    // --- Fetch Related Products ---
    let relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id }
    })
      .limit(4)
      .lean();

    if (relatedProducts.length < 4) {
      const brandProducts = await Product.find({
        brand: product.brand,
        _id: { $ne: product._id, $nin: relatedProducts.map(p => p._id) }
      })
        .limit(4 - relatedProducts.length)
        .lean();

      relatedProducts = [...relatedProducts, ...brandProducts];
    }

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



 const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, variantId } = req.body;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    // Create wishlist if it doesn't exist
    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        items: [{ productId, variantId: variantId || null }],
      });
      await wishlist.save();
      return res.json({ success: true, message: "Added to wishlist" });
    }

    // Check if item already exists
    const exists = wishlist.items.some(
      (item) =>
        item.productId.toString() === productId &&
        (variantId ? item.variantId?.toString() === variantId : true)
    );

    if (exists) {
      return res.json({ success: true, alreadyExists: true });
    }

    // Add new item
    wishlist.items.push({ productId, variantId: variantId || null });
    await wishlist.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Error adding to wishlist:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export default {
  getProductsPage,
  getProductDetailPage,
  searchProduct,
 addToWishlist
};
