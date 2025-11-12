
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Order from "../../models/orderModel.js"
import Coupon from "../../models/couponModel.js"
import Wallet from "../../models/walletModel.js"
import {getProductOfferDiscount} from "../userController/checkoutController.js"







const userOrderCOD = async (req, res) => {
  try {
    const userId = req.session.user;
    const { selectedAddressId, paymentMethod, coupon } = req.body;

    if (!selectedAddressId)
      return res.status(404).json({ success: false, message: "Please select an address" });

    if (paymentMethod !== "cod")
      return res.status(400).json({ success: false, message: "Only Cash On Delivery is applicable" });

    const address = await Address.findById(selectedAddressId);
    if (!address)
      return res.status(404).json({ success: false, message: "Address not found" });

    const cartData = await Cart.findOne({ userId }).populate("items.productId");
    const cartItems = cartData ? cartData.items : [];
    if (!cartItems.length)
      return res.status(400).json({ success: false, message: "Cart is empty" });

    // 🧮 Step 1: Calculate subtotal before discounts
    const subtotalBeforeDiscount = cartItems.reduce((sum, i) => sum + i.total, 0);

    // 🎟️ Step 2: Coupon logic
    let appliedCoupon = null;
    let couponAmount = 0;

    if (coupon) {
      appliedCoupon = await Coupon.findOne({
        code: coupon,
        isActive: true,
        isNonBlocked: true,
      });

      if (appliedCoupon) {
        if (subtotalBeforeDiscount < appliedCoupon.minPurchaseAmount) {
          return res.status(400).json({
            success: false,
            message: `Minimum purchase of ₹${appliedCoupon.minPurchaseAmount} is required to use this coupon.`,
          });
        }

        // Calculate discount
        if (appliedCoupon.discountType === "percentage") {
          couponAmount = Math.floor(
            (subtotalBeforeDiscount * appliedCoupon.discountValue) / 100
          );
          if (
            appliedCoupon.maxDiscountAmount &&
            couponAmount > appliedCoupon.maxDiscountAmount
          ) {
            couponAmount = appliedCoupon.maxDiscountAmount;
          }
        } else {
          couponAmount = appliedCoupon.discountValue;
        }
      }
    }

    // 📦 Step 3: Stock check
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

    // 🛍️ Step 4: Prepare order items with coupon distribution
    let totalDiscountAmount = 0;

    const orderItems = await Promise.all(
      cartItems.map(async (item) => {
        const variant = item.productId.variants[item.variantIndex];
        const originalPrice = variant.price;

        // Offer discount
        const { discountPercent, appliedOffer } = await getProductOfferDiscount(item.productId);
        const offerDiscountPerUnit =
          discountPercent > 0 ? Math.round((originalPrice * discountPercent) / 100) : 0;
        const priceAfterOffer = originalPrice - offerDiscountPerUnit;

        // 🧾 Coupon share logic
        const itemShare = item.total / subtotalBeforeDiscount;
        const couponDiscountTotal = itemShare * couponAmount;
        const couponDiscountPerUnit = couponDiscountTotal / item.quantity;

        // Final per-unit price
        const finalPricePerUnit = priceAfterOffer - couponDiscountPerUnit;

        // Total discount (offer + coupon)
        const totalItemDiscount = (offerDiscountPerUnit + couponDiscountPerUnit) * item.quantity;
        totalDiscountAmount += totalItemDiscount;

        return {
          productId: item.productId._id,
          variantId: variant._id,
          quantity: item.quantity,
          basePrice: originalPrice,
          discountAmount: Math.round(totalItemDiscount),
          finalPrice: Math.round(finalPricePerUnit),
          total: Math.round(finalPricePerUnit * item.quantity),
          appliedOffer: appliedOffer ? appliedOffer.name : null,
        };
      })
    );

    // 🧾 Step 5: Calculate totals
    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    const shippingCharge = subtotal > 1000 ? 0 : 50;
    const grandTotal = subtotal + shippingCharge;

    // 📉 Step 6: Update stock
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      variant.stock -= item.quantity;
      await item.productId.save();
    }

    // 🧾 Step 7: Create order
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

    // 🎟️ Step 8: Update coupon usage
    if (appliedCoupon) {
      appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
      await appliedCoupon.save();
    }

    // 🧹 Step 9: Clear cart
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [], grandTotal: 0 } },
      { new: true }
    );

    res.json({
      success: true,
      message: "Order placed successfully with Cash on Delivery!",
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
    const { selectedAddressId, paymentMethod, coupon } = req.body;

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

    // 🧮 Step 1: Calculate subtotal
    const subtotalBeforeDiscount = cartItems.reduce((sum, i) => sum + i.total, 0);

    let couponAmount = 0;
    let appliedCoupon = null;

    // 🧾 Step 2: Apply coupon
    if (coupon) {
      appliedCoupon = await Coupon.findOne({
        code: coupon,
        isActive: true,
        isNonBlocked: true,
      });

      if (appliedCoupon) {
        if (subtotalBeforeDiscount < appliedCoupon.minPurchaseAmount) {
          return res.status(400).json({
            success: false,
            message: `Minimum purchase of ₹${appliedCoupon.minPurchaseAmount} is required to use this coupon.`,
          });
        }

        if (appliedCoupon.discountType === "percentage") {
          couponAmount = Math.floor(
            (subtotalBeforeDiscount * appliedCoupon.discountValue) / 100
          );
          if (
            appliedCoupon.maxDiscountAmount &&
            couponAmount > appliedCoupon.maxDiscountAmount
          ) {
            couponAmount = appliedCoupon.maxDiscountAmount;
          }
        } else {
          couponAmount = appliedCoupon.discountValue;
        }
      }
    }

    const shippingCharge = subtotalBeforeDiscount > 1000 ? 0 : 50;
    const finalSubtotal = subtotalBeforeDiscount - couponAmount;
    const grandTotal = finalSubtotal + shippingCharge;

    // 💰 Step 3: Wallet check
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) wallet = new Wallet({ user: userId, balance: 0 });

    if (wallet.balance < grandTotal) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Required: ₹${grandTotal}, Available: ₹${wallet.balance}`,
      });
    }

    // 🧩 Step 4: Check stock
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

    // 🛒 Step 5: Build order items with offer & coupon discount distribution
    let totalDiscountAmount = 0;

    const orderItems = await Promise.all(
      cartItems.map(async (item) => {
        const variant = item.productId.variants[item.variantIndex];
        const originalPrice = variant.price;

        // Offer discount calculation
        const { discountPercent, appliedOffer } = await getProductOfferDiscount(item.productId);
        const offerDiscountPerUnit =
          discountPercent > 0 ? Math.round((originalPrice * discountPercent) / 100) : 0;
        const priceAfterOffer = originalPrice - offerDiscountPerUnit;

        // 🧮 Proportional coupon discount
        const itemShare = item.total / subtotalBeforeDiscount;
        const couponDiscountTotal = itemShare * couponAmount;
        const couponDiscountPerUnit = couponDiscountTotal / item.quantity;

        const finalPricePerUnit = priceAfterOffer - couponDiscountPerUnit;
        const totalItemDiscount = (offerDiscountPerUnit + couponDiscountPerUnit) * item.quantity;

        totalDiscountAmount += totalItemDiscount;

        return {
          productId: item.productId._id,
          variantId: variant._id,
          quantity: item.quantity,
          basePrice: originalPrice,
          discountAmount: Math.round(totalItemDiscount),
          finalPrice: Math.round(finalPricePerUnit),
          total: Math.round(finalPricePerUnit * item.quantity),
          appliedOffer: appliedOffer ? appliedOffer.name : null,
        };
      })
    );

    const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);

    // 📦 Step 6: Update stock
    for (let item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      variant.stock -= item.quantity;
      await item.productId.save();
    }

    // 💳 Step 7: Deduct wallet amount
    wallet.balance -= grandTotal;
    wallet.transactions.push({
      type: "Debit",
      amount: grandTotal,
      description: "Payment for order",
      date: new Date(),
    });
    await wallet.save();

    // 🧾 Step 8: Create order
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
      discount: Math.round(totalDiscountAmount),
      shippingCharge,
      grandTotal,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    });

    await order.save();

    // 🎟️ Step 9: Mark coupon usage
    if (appliedCoupon) {
      appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
      await appliedCoupon.save();
    }

    // 🧹 Step 10: Clear cart
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