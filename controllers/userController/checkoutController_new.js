import User from "../../models/userModel.js";
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Product from "../../models/productModel.js";
import Order from "../../models/orderModel.js"
import Coupon from "../../models/couponModel.js"
import Wallet from "../../models/walletModel.js"
import {createRazorpayOrder, verifyRazorpaySignature} from "../../utils/paymentServices.js"
import HTTP_STATUS from "../../utils/responseHandler.js"



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
    console.log("helo")
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

    // Coupon logic (replace with your function)
    let appliedCoupon = null;
    let couponAmount = 0;
    if (coupon) {
      appliedCoupon = await Coupon.findOne({ code: coupon, isActive: true });
      if (appliedCoupon) {
        couponAmount = appliedCoupon.discountType === "percentage"
          ? Math.floor(cartItems.reduce((sum, i) => sum + i.total, 0) * appliedCoupon.discountValue / 100)
          : appliedCoupon.discountValue;
      }
    }

    // Stock check
    const outOfStockItems = [];
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      if (!variant || variant.stock < item.quantity || variant.isBlocked) {
        outOfStockItems.push(item.productId.name);
      }
    }
    if (outOfStockItems.length > 0) {
      return res.status(400).json({ success: false, message: "Some items are out of stock", outOfStockItems });
    }

    // Prepare order items
    const subtotalBeforeDiscount = cartItems.reduce((sum, i) => sum + i.total, 0);
    const orderItems = cartItems.map(item => {
      const variant = item.productId.variants[item.variantIndex];
      const discountPerUnit = couponAmount > 0 
        ? Math.round((item.total / subtotalBeforeDiscount) * couponAmount) / item.quantity 
        : 0;
      const finalPricePerUnit = variant.price - discountPerUnit;
      
      return {
        productId: item.productId._id,
        variantId: variant._id,
        quantity: item.quantity,
        basePrice: variant.price,
        discountAmount: discountPerUnit,
        finalPrice: finalPricePerUnit,
        total: finalPricePerUnit * item.quantity,
        appliedOffer: appliedCoupon ? appliedCoupon.code : null,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    const shippingCharge = subtotal > 1000 ? 0 : 50;
    const grandTotal = subtotal + shippingCharge;

    // Update stock
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      variant.stock -= item.quantity;
      await item.productId.save();
    }

    // Create order
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
      discount: couponAmount,
      shippingCharge,
      grandTotal,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    });

    await order.save();

    // Update coupon usage
    if (appliedCoupon) {
      appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
      await appliedCoupon.save();
    }

    // Clear cart
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [], grandTotal: 0 } });

    res.json({ success: true, message: "Order placed successfully!", redirect: `/oder-status/${order._id}` });
  } catch (err) {
    console.error("COD Order Error:", err);
    res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
  }
};

// Create Razorpay Order
const createRazorpayOrderHandler = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { cart, selectedAddressId, paymentMethod, coupon, subtotal } = req.body;
    if (!selectedAddressId) return res.status(400).json({ success: false, message: "Please select an address" });
    const address = await Address.findById(selectedAddressId);
    if (!address) return res.status(404).json({ success: false, message: "Address not found" });
    const cartData = await Cart.findOne({ userId }).populate("items.productId");
    const cartItems = cartData ? cartData.items : [];
    if (!cartItems.length) return res.status(400).json({ success: false, message: "Cart is empty" });
    let subtotalAmount = cartItems.reduce((sum, i) => sum + i.total, 0);
    let couponAmount = 0;
    let appliedCoupon = null;
    if (coupon) {
      appliedCoupon = await Coupon.findOne({ code: coupon, isActive: true });
      if (appliedCoupon) {
        couponAmount = appliedCoupon.discountType === "percentage"
          ? Math.floor(subtotalAmount * appliedCoupon.discountValue / 100)
          : appliedCoupon.discountValue;
      }
    }
    const finalSubtotal = subtotalAmount - couponAmount;
    const shippingCharge = finalSubtotal > 1000 ? 0 : 50;
    const grandTotal = finalSubtotal + shippingCharge;
    const tempOrder = new Order({
      userId,
      items: cartItems.map(item => {
        const variant = item.productId.variants[item.variantIndex];
        return {
          productId: item.productId._id,
          variantId: variant._id,
          quantity: item.quantity,
          basePrice: variant.price,
          discountAmount: 0,
          finalPrice: variant.price,
          total: item.total,
        };
      }),
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
      paymentMethod: "RAZORPAY",
      paymentStatus: "Pending",
      orderStatus: "Pending",
      subtotal: subtotalAmount,
      discount: couponAmount,
      shippingCharge,
      grandTotal,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    });
    await tempOrder.save();
    const razorpayOrder = await createRazorpayOrder(grandTotal, `order_${tempOrder._id}`);
    res.json({ success: true, order: razorpayOrder, tempOrderId: tempOrder._id.toString() });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create Razorpay order" });
  }
};

// Verify Razorpay Payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    const { orderId, paymentId, signature, tempOrderId } = req.body;
    if (!orderId || !paymentId || !signature || !tempOrderId) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    if (!isValid) {
      await Order.findByIdAndUpdate(tempOrderId, { paymentStatus: "Failed" });
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }
    const order = await Order.findById(tempOrderId);
    if (!order || String(order.userId) !== String(userId)) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const cartData = await Cart.findOne({ userId }).populate("items.productId");
    const cartItems = cartData ? cartData.items : [];
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      if (!variant || variant.stock < item.quantity || variant.isBlocked) {
        await Order.findByIdAndUpdate(tempOrderId, { paymentStatus: "Failed" });
        return res.status(400).json({ success: false, message: "Some items are out of stock" });
      }
    }
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      variant.stock -= item.quantity;
      await item.productId.save();
    }
    let couponAmount = order.discount || 0;
    const subtotalBeforeDiscount = cartItems.reduce((sum, i) => sum + i.total, 0);
    const orderItems = cartItems.map(item => {
      const variant = item.productId.variants[item.variantIndex];
      const discountPerUnit = couponAmount > 0 
        ? Math.round((item.total / subtotalBeforeDiscount) * couponAmount) / item.quantity 
        : 0;
      const finalPricePerUnit = variant.price - discountPerUnit;
      return {
        productId: item.productId._id,
        variantId: variant._id,
        quantity: item.quantity,
        basePrice: variant.price,
        discountAmount: discountPerUnit,
        finalPrice: finalPricePerUnit,
        total: finalPricePerUnit * item.quantity,
        appliedOffer: order.appliedCoupon || null,
      };
    });
    order.items = orderItems;
    order.paymentStatus = "Paid";
    order.orderStatus = "Confirmed";
    order.razorpayPaymentId = paymentId;
    order.subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    await order.save();
    if (order.appliedCoupon) {
      const appliedCoupon = await Coupon.findOne({ code: order.appliedCoupon });
      if (appliedCoupon) {
        appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
        await appliedCoupon.save();
      }
    }
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [], grandTotal: 0 } });
    res.json({ success: true, message: "Payment verified successfully", orderId: order._id.toString() });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ success: false, message: err.message || "Payment verification failed" });
  }
};

// Wallet Payment
const walletPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    const { cart, selectedAddressId, paymentMethod, coupon } = req.body;
    if (!selectedAddressId) return res.status(400).json({ success: false, message: "Please select an address" });
    if (paymentMethod !== "wallet") return res.status(400).json({ success: false, message: "Invalid payment method" });
    const address = await Address.findById(selectedAddressId);
    if (!address) return res.status(404).json({ success: false, message: "Address not found" });
    const cartData = await Cart.findOne({ userId }).populate("items.productId");
    const cartItems = cartData ? cartData.items : [];
    if (!cartItems.length) return res.status(400).json({ success: false, message: "Cart is empty" });
    let subtotalAmount = cartItems.reduce((sum, i) => sum + i.total, 0);
    let couponAmount = 0;
    let appliedCoupon = null;
    if (coupon) {
      appliedCoupon = await Coupon.findOne({ code: coupon, isActive: true });
      if (appliedCoupon) {
        couponAmount = appliedCoupon.discountType === "percentage"
          ? Math.floor(subtotalAmount * appliedCoupon.discountValue / 100)
          : appliedCoupon.discountValue;
      }
    }
    const finalSubtotal = subtotalAmount - couponAmount;
    const shippingCharge = finalSubtotal > 1000 ? 0 : 50;
    const grandTotal = finalSubtotal + shippingCharge;
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) wallet = new Wallet({ user: userId, balance: 0 });
    if (wallet.balance < grandTotal) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Required: ₹${grandTotal}, Available: ₹${wallet.balance}`,
      });
    }
    const outOfStockItems = [];
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      if (!variant || variant.stock < item.quantity || variant.isBlocked) {
        outOfStockItems.push(item.productId.name);
      }
    }
    if (outOfStockItems.length > 0) {
      return res.status(400).json({ success: false, message: "Some items are out of stock", outOfStockItems });
    }
    const subtotalBeforeDiscount = cartItems.reduce((sum, i) => sum + i.total, 0);
    const orderItems = cartItems.map(item => {
      const variant = item.productId.variants[item.variantIndex];
      const discountPerUnit = couponAmount > 0 
        ? Math.round((item.total / subtotalBeforeDiscount) * couponAmount) / item.quantity 
        : 0;
      const finalPricePerUnit = variant.price - discountPerUnit;
      return {
        productId: item.productId._id,
        variantId: variant._id,
        quantity: item.quantity,
        basePrice: variant.price,
        discountAmount: discountPerUnit,
        finalPrice: finalPricePerUnit,
        total: finalPricePerUnit * item.quantity,
        appliedOffer: appliedCoupon ? appliedCoupon.code : null,
      };
    });
    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      variant.stock -= item.quantity;
      await item.productId.save();
    }
    wallet.balance -= grandTotal;
    wallet.transactions.push({ type: "Debit", amount: grandTotal, description: `Payment for order`, date: new Date() });
    await wallet.save();
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
      discount: couponAmount,
      shippingCharge,
      grandTotal,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    });
    await order.save();
    if (appliedCoupon) {
      appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
      await appliedCoupon.save();
    }
    await Cart.findOneAndUpdate({ userId }, { $set: { items: [], grandTotal: 0 } });
    res.json({ success: true, message: "Order placed successfully using wallet!", redirect: `/oder-status/${order._id}` });
  } catch (err) {
    console.error("Wallet payment error:", err);
    res.status(500).json({ success: false, message: err.message || "Wallet payment failed" });
  }
};

// Payment Failed Handler
const paymentFailed = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByIdAndUpdate(id, { paymentStatus: "Failed", orderStatus: "Cancelled" }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Payment failed status updated" });
  } catch (err) {
    console.error("Payment failed update error:", err);
    res.status(500).json({ success: false, message: "Failed to update payment status" });
  }
};

export default {
  getCartCheckout,
  selectAddres,
  userOrderSuccessPage,
  userOrderCOD,
  createRazorpayOrderHandler,
  verifyRazorpayPayment,
  walletPayment,
  paymentFailed,
};

