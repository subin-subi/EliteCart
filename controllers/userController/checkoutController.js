import User from "../../models/userModel.js";
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Order from "../../models/orderModel.js"
import Coupon from "../../models/couponModel.js"
import Wallet from "../../models/walletModel.js"
import Offer from "../../models/offerModel.js"


// Helper function to get offer discount for a product
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
      return grandTotal >= min && grandTotal <= max;
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

const userOrderCOD = async (req, res) => {
  try {
    const userId = req.session.user;
    const { cart, selectedAddressId, paymentMethod, coupon } = req.body;

    if (!selectedAddressId) {
      return res.status(404).json({ success: false, message: "You didn't select an address" });
    }

    if (paymentMethod !== "cod") {
      return res.status(400).json({ success: false, message: "Only Cash On Delivery is applicable" });
    }

    const address = await Address.findById(selectedAddressId);
    if (!address) return res.status(404).json({ success: false, message: "Address not found" });

    const cartData = await Cart.findOne({ userId }).populate("items.productId");
    const cartItems = cartData ? cartData.items : [];
    if (!cartItems.length) return res.status(400).json({ success: false, message: "Cart is empty" });

    //  Coupon logic
    let appliedCoupon = null;
    let couponAmount = 0;
    if (coupon) {
      appliedCoupon = await Coupon.findOne({ code: coupon, isActive: true });
      if (appliedCoupon) {
        const cartTotal = cartItems.reduce((sum, i) => sum + i.total, 0);
        couponAmount =
          appliedCoupon.discountType === "percentage"
            ? Math.floor((cartTotal * appliedCoupon.discountValue) / 100)
            : appliedCoupon.discountValue;
      }
    }

    //  Stock check
    const outOfStockItems = [];
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      if (!variant || variant.stock < item.quantity || variant.isBlocked) {
        outOfStockItems.push(item.productId.name);
      }
    }

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some items are out of stock",
        outOfStockItems,
      });
    }

    //  Prepare order items
    const subtotalBeforeDiscount = cartItems.reduce((sum, i) => sum + i.total, 0);
    let totalDiscountAmount = 0; // 👈 track total offer + coupon discount

    const orderItems = await Promise.all(
      cartItems.map(async (item) => {
        const variant = item.productId.variants[item.variantIndex];
        const originalPrice = variant.price;

        // Offer discount
        const { discountPercent, appliedOffer } = await getProductOfferDiscount(item.productId);
        const offerDiscountAmount =
          discountPercent > 0 ? Math.round((originalPrice * discountPercent) / 100) : 0;
        const priceAfterOffer = originalPrice - offerDiscountAmount;

        // Coupon discount 
        const couponDiscountPerUnit =
          couponAmount > 0
            ? Math.round((item.total / subtotalBeforeDiscount) * couponAmount) / item.quantity
            : 0;

        const finalPricePerUnit = priceAfterOffer - couponDiscountPerUnit;

        //  total discount for this item
        const totalDiscountForItem =
          (originalPrice - finalPricePerUnit) * item.quantity;

        totalDiscountAmount += totalDiscountForItem; 

        return {
          productId: item.productId._id,
          variantId: variant._id,
          quantity: item.quantity,
          basePrice: originalPrice,
          discountAmount: totalDiscountForItem, 
          finalPrice: finalPricePerUnit,
          total: finalPricePerUnit * item.quantity,
          appliedOffer: appliedOffer ? appliedOffer.name : null,
        };
      })
    );

    //  Calculate totals
    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    const shippingCharge = subtotal > 1000 ? 0 : 50;
    const grandTotal = subtotal + shippingCharge;

    //  Update stock
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      variant.stock -= item.quantity;
      await item.productId.save();
    }

    //  Create order
    const order = new Order({
      userId,
      items: orderItems,
      address: {
        name: address.name,
        house: address.houseName,
        street: address.street,
        city: address.city,
        state: address.state,
        country: address.country,
        pincode: address.pincode,
        mobile: address.mobile,
      },
      paymentMethod: "COD",
      paymentStatus: "Pending",
      orderStatus: "Pending",
      subtotal,
      discount: Math.round(totalDiscountAmount), 
      shippingCharge,
      grandTotal,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    });

    await order.save();

    
    if (appliedCoupon) {
      appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
      await appliedCoupon.save();
    }

    // Clear cart
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [], grandTotal: 0 } },
      { new: true }
    );

    res.json({
      success: true,
      message: "Order placed successfully!",
      redirect: `/order-status/${order._id}`,
    });
  } catch (err) {
    console.error("COD Order Error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};


// Wallet Payment
const walletPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    const { cart, selectedAddressId, paymentMethod, coupon } = req.body;

    // Validate payment and address
    if (!selectedAddressId)
      return res.status(400).json({ success: false, message: "Please select an address" });

    if (paymentMethod !== "wallet")
      return res.status(400).json({ success: false, message: "Invalid payment method" });

    const address = await Address.findById(selectedAddressId);
    if (!address)
      return res.status(404).json({ success: false, message: "Address not found" });

    const cartData = await Cart.findOne({ userId }).populate("items.productId");
    const cartItems = cartData ? cartData.items : [];
    if (!cartItems.length)
      return res.status(400).json({ success: false, message: "Cart is empty" });

    // Calculate subtotal and coupon
    let subtotalAmount = cartItems.reduce((sum, i) => sum + i.total, 0);
    let couponAmount = 0;
    let appliedCoupon = null;

    if (coupon) {
      appliedCoupon = await Coupon.findOne({ code: coupon, isActive: true });
      if (appliedCoupon) {
        couponAmount =
          appliedCoupon.discountType === "percentage"
            ? Math.floor((subtotalAmount * appliedCoupon.discountValue) / 100)
            : appliedCoupon.discountValue;
      }
    }

    const finalSubtotal = subtotalAmount - couponAmount;
    const shippingCharge = finalSubtotal > 1000 ? 0 : 50;
    const grandTotal = finalSubtotal + shippingCharge;

    //  Wallet balance check
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) wallet = new Wallet({ user: userId, balance: 0 });

    if (wallet.balance < grandTotal) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Required: ₹${grandTotal}, Available: ₹${wallet.balance}`,
      });
    }

    //  Stock check
    const outOfStockItems = [];
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      if (!variant || variant.stock < item.quantity || variant.isBlocked) {
        outOfStockItems.push(item.productId.name);
      }
    }

    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some items are out of stock",
        outOfStockItems,
      });
    }

    const subtotalBeforeDiscount = cartItems.reduce((sum, i) => sum + i.total, 0);
    let totalDiscountAmount = 0;

    //  Prepare order items
    const orderItems = await Promise.all(
      cartItems.map(async (item) => {
        const variant = item.productId.variants[item.variantIndex];
        const originalPrice = variant.price;

        // Offer discount
        const { discountPercent, appliedOffer } = await getProductOfferDiscount(item.productId);
        const offerDiscountAmount =
          discountPercent > 0 ? Math.round((originalPrice * discountPercent) / 100) : 0;
        const priceAfterOffer = originalPrice - offerDiscountAmount;

        // Coupon discount per unit
        const couponDiscountPerUnit =
          couponAmount > 0
            ? Math.round((item.total / subtotalBeforeDiscount) * couponAmount) / item.quantity
            : 0;

        const finalPricePerUnit = priceAfterOffer - couponDiscountPerUnit;
        const totalItemDiscount = (offerDiscountAmount + couponDiscountPerUnit) * item.quantity;
        totalDiscountAmount += totalItemDiscount;

        return {
          productId: item.productId._id,
          variantId: variant._id,
          quantity: item.quantity,
          basePrice: originalPrice,
          discountAmount: totalItemDiscount,
          finalPrice: finalPricePerUnit,
          total: finalPricePerUnit * item.quantity,
          appliedOffer: appliedOffer ? appliedOffer.name : null,
        };
      })
    );

    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);

    //  Update stock
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      variant.stock -= item.quantity;
      await item.productId.save();
    }

    //  Deduct from wallet
    wallet.balance -= grandTotal;
    wallet.transactions.push({
      type: "Debit",
      amount: grandTotal,
      description: `Payment for order`,
      date: new Date(),
    });
    await wallet.save();

    //  Create order
    const order = new Order({
      userId,
      items: orderItems,
      address: {
        name: address.name,
        house: address.houseName,
        street: address.street,
        city: address.city,
        state: address.state,
        country: address.country,
        pincode: address.pincode,
        mobile: address.mobile,
      },
      paymentMethod: "WALLET",
      paymentStatus: "Paid",
      orderStatus: "Confirmed",
      subtotal,
      discount: totalDiscountAmount,
      shippingCharge,
      grandTotal,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    });

    await order.save();

    //  Update coupon usage
    if (appliedCoupon) {
      appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
      await appliedCoupon.save();
    }

    //  Clear cart
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [], grandTotal: 0 } },
      { new: true }
    );

    res.json({
      success: true,
      message: "Order placed successfully using wallet!",
      redirect: `/order-status/${order._id}`,
    });
  } catch (err) {
    console.error("Wallet payment error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Wallet payment failed",
    });
  }
};


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







export default {
  getCartCheckout,
  selectAddres,
  userOrderSuccessPage,
  userOrderCOD,
  walletPayment,
  paymentFailed,
  getPaymentFailPage,
 
};

