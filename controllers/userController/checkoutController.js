import User from "../../models/userModel.js";
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Order from "../../models/orderModel.js"
import Coupon from "../../models/couponModel.js"
import Wallet from "../../models/walletModel.js"
import Offer from "../../models/offerModel.js"



export async function getProductOfferDiscount(product) {
  try {
    const currentDate = new Date();
    const activeOffers = await Offer.find({
      isActive: true,
      isNonBlocked: true,
      startAt: { $lte: currentDate },
      endAt: { $gte: currentDate },
    }).lean();

    let discountPercent = 0;
    let appliedOffer = null;

    // Check product offers
    const productOffers = activeOffers.filter(
      (offer) => offer.offerType === "PRODUCT" && offer.productId?.toString() === product._id.toString()
    );

    // Check category offers
    const categoryOffers = activeOffers.filter(
      (offer) => offer.offerType === "CATEGORY" && offer.categoryId?.toString() === product.category?.toString()
    );

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

    return { discountPercent, appliedOffer };
  } catch (err) {
    console.error("Error getting product offer:", err);
    return { discountPercent: 0, appliedOffer: null };
  }
}

const getCartCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(userId);
    const addresses = await Address.find({ userId });
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).render("partials/error", {
        message: "Your cart is empty. Please add items before proceeding to checkout.",
      });
    }

    // --- Validate stock and prepare cart items ---
    let outOfStockItems = [];
    const cartItems = cart.items.map((item) => {
      const product = item.productId;
      const variant = product.variants[item.variantIndex];

      if (!variant || variant.stock <= 0 || variant.isHidden) {
        outOfStockItems.push(product.name);
      }

      return {
        productId: product._id,
        variantId: variant?._id || null,
        name: product.name,
        mainImage: variant?.mainImage || "",
        volume: variant?.volume || 0,
        price: variant?.discountPrice || variant?.price || 0,
        quantity: item.quantity,
        total: item.total,
      };
    });

    if (outOfStockItems.length > 0) {
      return res.status(400).render("partials/error", {
        message: `Some products are out of stock: ${outOfStockItems.join(", ")}. Please remove them from your cart.`,
      });
    }

    // --- Calculate totals ---
    const grandTotal = cart.grandTotal || cartItems.reduce((sum, i) => sum + i.total, 0);

    const currentDate = new Date();

    // --- Fetch active coupons ---
    const availableCoupons = await Coupon.find({
      isActive: true,
      isNonBlocked: true,
      expiryDate: { $gte: currentDate },
      $or: [{ "usedBy.userId": { $ne: userId } }, { usedBy: { $size: 0 } }],
    }).lean();

    // --- Filter valid coupons ---
    const validCoupons = availableCoupons.filter((coupon) => {
      const min = coupon.minPurchaseAmount || 0;
      const max = coupon.maxDiscountAmount || Infinity;
      return grandTotal >= min 
    });

    // --- Handle applied coupon ---
    const appliedCode = req.query.coupon;
    let discountAmount = 0;
    let finalTotal = grandTotal;
    let appliedCoupon = null;

    if (appliedCode) {
      appliedCoupon = validCoupons.find((c) => c.code === appliedCode);

      if (appliedCoupon) {
        const { discountType, discountValue } = appliedCoupon;

        if (discountType === "percentage") {
          discountAmount = Math.floor((grandTotal * discountValue) / 100);
        } else if (discountType === "flat") {
          discountAmount = discountValue;
        }

        finalTotal = grandTotal - discountAmount;
      }
    }

    // --- Shipping logic ---
    const shippingCost = finalTotal > 1000 ? 0 : 50;
    const payableTotal = finalTotal + shippingCost;

  
  res.render("user/checkout", {
  user,
  cart: cartItems,
  addresses,
  total: payableTotal,
  subtotal: grandTotal,
  finalTotal,
  discountAmount,
  shippingCost,
  payableTotal,
  productIds: cartItems.map((i) => i.productId).join(","),
  variantIds: cartItems.map((i) => i.variantId).join(","),
  availableCoupons: validCoupons,
  appliedCoupon,
  coupon: appliedCoupon, 
});

  } catch (error) {
    console.error("🛒 Cart Checkout Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const selectAddres = async (req, res) => {
  try {
    const { addressId } = req.body;
    req.session.selectedAddress = addressId; 
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error selecting address' });
  }
};

const userOrderSuccessPage = async (req,res)=>{
    try{
        const userId = req.session.user;
        const id = req.params.id;
        
        const order = await Order.findById(id); 
        if(!order || String(order.userId) !== String(userId)) {
            return res.render("partials/error", { message: "Order not found" });
        }
        
        return res.render("user/userSuccess",{
            order
        })
    }catch(err){
        console.error("Order success page error:", err);
        return res.render("partials/error", { message: "Error loading order details" })
    }
}




// Payment Failed Handler
const paymentFailed = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findByIdAndUpdate(
      id, 
      { paymentStatus: "Failed" }, 
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Payment failed status updated" });
  } catch (err) {
    console.error("Payment failed update error:", err);
    res.status(500).json({ success: false, message: "Failed to update payment status" });
  }
};





const getPaymentFailPage = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Validate orderId is not undefined or invalid
    if (!orderId || orderId === "undefined" || orderId === "null") {
      return res.status(400).render("partials/error", { 
        message: "Invalid order ID. Please check your order details." 
      });
    }

    // Validate ObjectId format
    if (!orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render("partials/error", { 
        message: "Invalid order ID format. Please check your order details." 
      });
    }
    
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).render("partials/error", { 
        message: "Order not found. Please check your order details." 
      });
    }

    res.status(200).render("user/paymentFail.ejs", { order });
  } catch (err) {
    console.error("Error loading payment fail page:", err);
    res.status(500).render("partials/error", { 
      message: "Something went wrong while loading the page. Please try again later." 
    });
  }
};


const addCoupon = async (req, res) => {
  try {
    let { code, total } = req.body;
    const userId = req.session.user; 
    const shippingCost = 50; 

    total = parseFloat(total);

    // ✅ Find valid, active, non-blocked coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true, isNonBlocked: true });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid or inactive coupon." });
    }

    // ✅ Expiry check
    const now = new Date();
    if (coupon.expiryDate < now) {
      return res.status(400).json({ success: false, message: "Coupon has expired." });
    }

    // ✅ Minimum purchase check
    if (total < coupon.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₹${coupon.minPurchaseAmount} required.`,
      });
    }

    // ✅ Check if user already used this coupon
    const alreadyUsed = coupon.usedBy.some((u) => u.userId?.toString() === userId?.toString());
    if (alreadyUsed) {
      return res.status(400).json({ success: false, message: "You have already used this coupon." });
    }

    // ✅ Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (total * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
      discountAmount = Math.floor(discountAmount); // remove decimals
    } else if (coupon.discountType === "flat") {
      discountAmount = coupon.discountValue;
    }

    let discountedSubtotal = total - discountAmount;
    if (discountedSubtotal < 0) discountedSubtotal = 0;

    // ✅ Add shipping only if below 1000
    let discountedTotal = discountedSubtotal;
    if (discountedSubtotal < 1000) {
      discountedTotal += shippingCost;
    }

    // ❌ Removed coupon.usedBy.push() here — handled after payment success
    console.log("Coupon applied:", { discountAmount, discountedTotal });

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully!",
      discountAmount,
      discountedTotal,
    });

  } catch (err) {
    console.error("Error from addCoupon:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};




export default {
  getCartCheckout,
  selectAddres,
  userOrderSuccessPage,
  paymentFailed,
  getPaymentFailPage,
  addCoupon
};

