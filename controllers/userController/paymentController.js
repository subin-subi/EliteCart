
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Order from "../../models/orderModel.js"
import Coupon from "../../models/couponModel.js"
import Wallet from "../../models/walletModel.js"
import {getProductOfferDiscount} from "../userController/checkoutController.js"







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


export default ({
userOrderCOD,
walletPayment
})