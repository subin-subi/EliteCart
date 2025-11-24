import Product from "../../models/productModel.js";
import Brand from "../../models/brandModel.js";
import Category from "../../models/categoryModel.js";
import Wishlist from "../../models/wishlistModel.js";
import Offer from "../../models/offerModel.js";
import HTTP_STATUS from "../../utils/responseHandler.js";

const getProductsPage = async (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, stock, search, page, sort } = req.query;
    const userId = req.session.user;

    // ---------------------------
    // 1. BASE FILTER
    // ---------------------------
    const filter = { isBlocked: { $ne: true } };

    if (category && category !== "all") filter.category = category;
    if (brand && brand !== "all") filter.brand = brand;

    // ---------------------------
    // 2. SEARCH FILTER (Prevent ***** etc.)
    // ---------------------------
    if (search && search.trim()) {
      const trimmed = search.trim();

      const hasValidChars = /[A-Za-z0-9]/.test(trimmed);
      if (!hasValidChars) return res.redirect("/product");

      filter.name = { $regex: trimmed, $options: "i" };
    }

    // ---------------------------
    // 3. PAGINATION CONFIG
    // ---------------------------
    const currentPage = Math.max(parseInt(page || "1", 10), 1);
    const limit = 12;
    const skip = (currentPage - 1) * limit;

    // ---------------------------
    // 4. FETCH ACTIVE OFFERS
    // ---------------------------
    const now = new Date();
    const activeOffers = await Offer.find({
      isActive: true,
      isNonBlocked: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    }).lean();

    // ---------------------------
    // 5. FETCH PRODUCTS
    // ---------------------------
    let products = await Product.find(filter)
      .populate({
        path: "category",
        match: { isActive: true, isHidden: false },
      })
      .populate({
        path: "brand",
        match: { isActive: true, isHidden: false },
      })
      .lean();

    // Remove invalid category/brand
    products = products.filter((p) => p.category && p.brand);

    // ---------------------------
    // 6. APPLY OFFERS & FILTER VARIANTS
    // ---------------------------
    products = products
      .map((product) => {
        const productOffers = activeOffers.filter(
          (offer) =>
            offer.offerType === "PRODUCT" &&
            offer.productId?.toString() === product._id.toString()
        );

        const categoryOffers = activeOffers.filter(
          (offer) =>
            offer.offerType === "CATEGORY" &&
            offer.categoryId?.toString() === product.category._id.toString()
        );

        // Max discount per product
        let discountPercent = 0;

        if (productOffers.length > 0) {
          discountPercent = Math.max(...productOffers.map((o) => o.discountPercent));
        }
        if (categoryOffers.length > 0) {
          discountPercent = Math.max(discountPercent, ...categoryOffers.map((o) => o.discountPercent));
        }

        // Apply discount to variants
        const updatedVariants = product.variants
          .filter((v) => !v.isBlocked)
          .map((v) => {
            const discountPrice =
              discountPercent > 0
                ? v.price - (v.price * discountPercent) / 100
                : v.price;

            return {
              ...v,
              discountPercent,
              discountPrice: Math.round(discountPrice),
            };
          });

        // Variant filters
        const validVariants = updatedVariants.filter((v) => {
          if (minPrice && v.discountPrice < Number(minPrice)) return false;
          if (maxPrice && v.discountPrice > Number(maxPrice)) return false;
          if (stock === "inStock" && v.stock <= 0) return false;
          if (stock === "outOfStock" && v.stock > 0) return false;
          return true;
        });

        if (validVariants.length === 0) return null;

        return { ...product, variants: validVariants };
      })
      .filter((product) => product !== null);

    // ---------------------------
    // 7. SORTING
    // ---------------------------
    if (sort === "priceLowToHigh") {
      products.sort((a, b) => a.variants[0].discountPrice - b.variants[0].discountPrice);
    } else if (sort === "priceHighToLow") {
      products.sort((a, b) => b.variants[0].discountPrice - a.variants[0].discountPrice);
    } else if (sort === "az") {
      products.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "za") {
      products.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // ---------------------------
    // 8. PAGINATION
    // ---------------------------
    const totalProducts = products.length;
    const paginatedProducts = products.slice(skip, skip + limit);

    // ---------------------------
    // 9. FETCH CATEGORIES & BRANDS
    // ---------------------------
    const [categories, brands] = await Promise.all([
      Category.find({ isActive: true, isHidden: false }).sort({ name: 1 }).lean(),
      Brand.find({ isActive: true, isHidden: false }).sort({ name: 1 }).lean(),
    ]);

    // ---------------------------
    // 10. FETCH USER WISHLIST
    // ---------------------------
    let wishlistItems = [];

    if (userId) {
      const wishlist = await Wishlist.findOne({ userId }).lean();
      if (wishlist) {
        wishlistItems = wishlist.items.map((item) => item.productId.toString());
      }
    }

    // ---------------------------
    // 11. RENDER PAGE
    // ---------------------------
    res.render("user/product", {
      products: paginatedProducts,
      categories,
      brands,
      wishlistItems, // ⭐ Send wishlist to EJS
      filters: { category, brand, minPrice, maxPrice, stock, search, sort },
      pagination: {
        currentPage,
        totalPages: Math.max(Math.ceil(totalProducts / limit), 1),
        totalProducts,
      },
    });
  } catch (error) {
    console.error("Error loading products page:", error);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};








const getProductDetailPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.id;

   
    const product = await Product.findById(productId)
      .populate("category")
      .populate("brand")
      .lean();

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).send("Product not found");
    }

    const now = new Date();

    
    const activeOffers = await Offer.find({
      isActive: true,
      isNonBlocked: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    }).lean();

    //  Offers for main product
    const productOffers = activeOffers.filter(
      (offer) =>
        offer.offerType === "PRODUCT" &&
        offer.productId?.toString() === product._id.toString()
    );

    const categoryOffers = activeOffers.filter(
      (offer) =>
        offer.offerType === "CATEGORY" &&
        offer.categoryId?.toString() === product.category._id.toString()
    );


    let discountPercent = 0;
    let appliedOffer = null; // 🔹 Added to store the offer name

    if (productOffers.length > 0) {
      const bestProductOffer = productOffers.reduce((max, offer) =>
        offer.discountPercent > max.discountPercent ? offer : max
      );
      discountPercent = bestProductOffer.discountPercent;
      appliedOffer = bestProductOffer;
    }

    if (categoryOffers.length > 0) {
      const bestCategoryOffer = categoryOffers.reduce((max, offer) =>
        offer.discountPercent > max.discountPercent ? offer : max
      );
      if (bestCategoryOffer.discountPercent > discountPercent) {
        discountPercent = bestCategoryOffer.discountPercent;
        appliedOffer = bestCategoryOffer;
      }
    }

    
    product.variants = product.variants.map((variant) => {
      let discountPrice = variant.price;
      if (discountPercent > 0) {
        discountPrice = Math.round(
          variant.price - (variant.price * discountPercent) / 100
        );
      }
      return {
        ...variant,
        discountPrice,
        discountPercent,
      };
    });

  
    if (appliedOffer) {
      product.appliedOffer = {
        name: appliedOffer.name,
        discountPercent: appliedOffer.discountPercent,
      };
    }

    //  Wishlist check
    let isInWishlist = false;
    if (userId) {
      const wishlist = await Wishlist.findOne({ userId }).lean();
      if (wishlist) {
        isInWishlist = wishlist.items.some(
          (item) => item.productId.toString() === productId
        );
      }
    }
    product.isInWishlist = isInWishlist;

    //  Related products (category → brand → random)
    let relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
    })
      .limit(4)
      .lean();

    if (relatedProducts.length < 4) {
      const brandProducts = await Product.find({
        brand: product.brand._id,
        _id: { $ne: product._id, $nin: relatedProducts.map((p) => p._id) },
      })
        .limit(4 - relatedProducts.length)
        .lean();
      relatedProducts = [...relatedProducts, ...brandProducts];
    }

    if (relatedProducts.length < 4) {
      const otherProducts = await Product.find({
        _id: { $ne: product._id, $nin: relatedProducts.map((p) => p._id) },
      })
        .limit(4 - relatedProducts.length)
        .lean();
      relatedProducts = [...relatedProducts, ...otherProducts];
    }

    //  Apply offer logic to related products
    relatedProducts = relatedProducts.map((p) => {
      const productOffers = activeOffers.filter(
        (offer) =>
          offer.offerType === "PRODUCT" &&
          offer.productId?.toString() === p._id.toString()
      );

      const categoryOffers = activeOffers.filter(
        (offer) =>
          offer.offerType === "CATEGORY" &&
          offer.categoryId?.toString() === p.category?.toString()
      );

      let discountPercent = 0;
      let appliedOffer = null; 

      if (productOffers.length > 0) {
        const bestProductOffer = productOffers.reduce((max, offer) =>
          offer.discountPercent > max.discountPercent ? offer : max
        );
        discountPercent = bestProductOffer.discountPercent;
        appliedOffer = bestProductOffer;
      }

      if (categoryOffers.length > 0) {
        const bestCategoryOffer = categoryOffers.reduce((max, offer) =>
          offer.discountPercent > max.discountPercent ? offer : max
        );
        if (bestCategoryOffer.discountPercent > discountPercent) {
          discountPercent = bestCategoryOffer.discountPercent;
          appliedOffer = bestCategoryOffer;
        }
      }

      //  Apply discount and attach offer name
      p.variants = p.variants.map((variant) => {
        let discountPrice = variant.price;
        if (discountPercent > 0) {
          discountPrice = Math.round(
            variant.price - (variant.price * discountPercent) / 100
          );
        }
        return {
          ...variant,
          discountPrice,
          discountPercent,
        };
      });

      if (appliedOffer) {
        p.appliedOffer = {
          name: appliedOffer.name,
          discountPercent: appliedOffer.discountPercent,
        };
      }

      return p;
    });

  
    res.render("user/productDetail", {
      product,
      relatedProducts,
    });
  } catch (error) {
    console.error("Error loading product detail:", error);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};




 const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, variantId } = req.body;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Please log in first" });
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
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};


export default {
  getProductsPage,
  getProductDetailPage,
 addToWishlist
};
