import Cart from "../../models/cartModel.js";
import Product from "../../models/productModel.js";
import Wishlist from "../../models/wishlistModel.js";
import Offer from "../../models/offerModel.js"


const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: [
          { path: "category", select: "name" },
          { path: "brand", select: "name" }
        ],
      })
      .lean();

    if (!wishlist || wishlist.items.length === 0) {
      return res.render("user/wishlist", { userid: userId, wishlist: { items: [] } });
    }

    
    const now = new Date();
    const activeOffers = await Offer.find({
      isActive: true,
      isNonBlocked: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    }).lean();

    // Map items to attach variant and offer info
    wishlist.items = wishlist.items.map(item => {
      const product = item.productId;
      if (!product || !product.variants || product.variants.length === 0) {
        item.variant = null;
        return item;
      }

      // Pick variant
      const variant = item.variantId
        ? product.variants.find(v => v._id.toString() === item.variantId.toString())
        : product.variants[0];

      // Find applicable product and category offers
      const productOffers = activeOffers.filter(
        offer => offer.offerType === "PRODUCT" && offer.productId?.toString() === product._id.toString()
      );
      const categoryOffers = activeOffers.filter(
        offer => offer.offerType === "CATEGORY" && offer.categoryId?.toString() === product.category._id.toString()
      );

      // Pick the best discount
      let discountPercent = 0;
      let appliedOffer = null;

      if (productOffers.length > 0) {
        const bestProductOffer = productOffers.reduce((max, o) =>
          o.discountPercent > max.discountPercent ? o : max
        );
        discountPercent = bestProductOffer.discountPercent;
        appliedOffer = bestProductOffer;
      }

      if (categoryOffers.length > 0) {
        const bestCategoryOffer = categoryOffers.reduce((max, o) =>
          o.discountPercent > max.discountPercent ? o : max
        );
        if (bestCategoryOffer.discountPercent > discountPercent) {
          discountPercent = bestCategoryOffer.discountPercent;
          appliedOffer = bestCategoryOffer;
        }
      }

      // Calculate discount price
      const discountPrice = discountPercent > 0
        ? Math.round(variant.price - (variant.price * discountPercent) / 100)
        : variant.price;

      item.variant = {
        ...variant,
        discountPrice,
        discountPercent,
      };

      // Attach offer info if exists
      if (appliedOffer) {
        item.appliedOffer = {
          name: appliedOffer.name,
          discountPercent: appliedOffer.discountPercent,
        };
      }

      return item;
    });

    res.render("user/wishlist", {
      userid: userId,
      wishlist,
    });

  } catch (err) {
    console.error("Error from wishlist:", err);
    res.status(500).send("Internal Server Error");
  }
};



const removeWishlist = async(req, res)=>{
  try{
    const userId = req.session.user;
    const {productId} = req.params;

    await Wishlist.updateOne({userId},
      {$pull:{items:{productId}}}
    );

    res.redirect("/wishlist")
  }catch(err){
     console.error("Error removing product from wishlist:", err);
    res.status(500).send("Internal Server Error");
  }
}

const addToCartFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, variantId } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first" });
    }

    if (!productId || !variantId) {
      return res.status(400).json({ success: false, message: "Missing product or variant ID" });
    }

    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const variantIndex = product.variants.findIndex(
      (v) => v._id.toString() === variantId
    );
    if (variantIndex === -1) {
      return res.status(404).json({ success: false, message: "Variant not found" });
    }

    const variant = product.variants[variantIndex];
    const quantity = 1;
    const price = Number(variant.discountPrice || variant.price || 0);
    const total = price * quantity;
    const maxLimit = 10; 

    
    let cart = await Cart.findOne({ userId });

   
    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, variantIndex, quantity, price, total }],
        grandTotal: total,
      });
    } else {
      
      const existingItem = cart.items.find(
        (item) =>
          item.productId.toString() === productId &&
          item.variantIndex === variantIndex
      );

      if (existingItem) {
       
        if (existingItem.quantity >= maxLimit) {
          
          await Wishlist.updateOne(
            { userId },
            { $pull: { items: { productId, $or: [{ variantId }, { variantId: null }] } } }
          );

          return res.status(400).json({
            success: false,
            message: `You can only add up to ${maxLimit} of this product. Product removed from wishlist.`,
          });
        }

       
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * price;
      } else {
        
        cart.items.push({ productId, variantIndex, quantity, price, total });
      }

      cart.grandTotal = cart.items.reduce((acc, item) => acc + item.total, 0);
    }

    await cart.save();

   
    await Wishlist.updateOne(
      { userId },
      { $pull: { items: { productId, $or: [{ variantId }, { variantId: null }] } } }
    );

    res.status(200).json({
      success: true,
      message: "Added to cart successfully and removed from wishlist",
    });

  } catch (err) {
    console.error("Error adding to cart from wishlist:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

const notificationCount = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res.json({ wishlistCount: 0, cartCount: 0 });
    }

    const wishlist = await Wishlist.findOne({ userId }, "items");
    const cart = await Cart.findOne({ userId }, "items");

    const wishlistCount = wishlist ? wishlist.items.length : 0;
    const cartCount = cart ? cart.items.length : 0;

    res.json({ wishlistCount, cartCount });

  } catch (err) {
    console.error("Error getting counts:", err);
    res.status(500).json({ wishlistCount: 0, cartCount: 0 });
  }
};



export default ({
  getWishlist,
  removeWishlist,
  addToCartFromWishlist,
  notificationCount
});


