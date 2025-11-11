
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Product from "../../models/productModel.js";
import Order from "../../models/orderModel.js"
import Coupon from "../../models/couponModel.js"
import {createRazorpayOrder, verifyRazorpaySignature} from "../../utils/paymentServices.js"
import {getProductOfferDiscount} from "../userController/checkoutController.js"







const createRazorpayOrderHandler = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { cart, selectedAddressId, paymentMethod, coupon, subtotal } = req.body;
    if (!selectedAddressId)
      return res.status(400).json({ success: false, message: "Please select an address" });

    const address = await Address.findById(selectedAddressId);
    if (!address)
      return res.status(404).json({ success: false, message: "Address not found" });

    const cartData = await Cart.findOne({ userId }).populate("items.productId");
    const cartItems = cartData ? cartData.items : [];
    if (!cartItems.length)
      return res.status(400).json({ success: false, message: "Cart is empty" });

    //  Calculate offer discounts
    let subtotalAmount = 0;
    let totalDiscountAmount = 0;
    const detailedItems = [];

    for (const item of cartItems) {
      const variant = item.productId.variants[item.variantIndex];
      const originalPrice = variant.price;

      // Product offer discount
      const { discountPercent, appliedOffer } = await getProductOfferDiscount(item.productId);
      const offerDiscountPerUnit =
        discountPercent > 0 ? Math.round((originalPrice * discountPercent) / 100) : 0;

      const priceAfterOffer = originalPrice - offerDiscountPerUnit;
      const totalPrice = priceAfterOffer * item.quantity;

      // Total discount for this item
      const totalDiscountForItem = offerDiscountPerUnit * item.quantity;
      totalDiscountAmount += totalDiscountForItem;
      subtotalAmount += totalPrice;

      detailedItems.push({
        productId: item.productId._id,
        variantId: variant._id,
        quantity: item.quantity,
        basePrice: originalPrice,
        discount: Math.round(totalDiscountForItem), 
        finalPrice: priceAfterOffer,
        total: totalPrice,
        appliedOffer: appliedOffer ? appliedOffer.name : null,
      });
    }

    //  Apply coupon logic
    let couponAmount = 0;
    let appliedCoupon = null;

    if (coupon) {
      appliedCoupon = await Coupon.findOne({ code: coupon, isActive: true });
      if (appliedCoupon) {
        couponAmount =
          appliedCoupon.discountType === "percentage"
            ? Math.floor((subtotalAmount * appliedCoupon.discountValue) / 100)
            : appliedCoupon.discountValue;

        // Distribute coupon discount across items proportionally
        const totalBeforeCoupon = subtotalAmount;
        detailedItems.forEach((item) => {
          const itemShare = item.total / totalBeforeCoupon;
          const couponShare = itemShare * couponAmount;
          item.discount += Math.round(couponShare);
          totalDiscountAmount += Math.round(couponShare);
        });
      }
    }

    //  Final total calculations
    const finalSubtotal = subtotalAmount - couponAmount;
    const shippingCharge = finalSubtotal > 1000 ? 0 : 50;
    const grandTotal = finalSubtotal + shippingCharge;

    //  Create temporary order
    const tempOrder = new Order({
      userId,
      items: detailedItems,
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
      discount: Math.round(totalDiscountAmount), 
      shippingCharge,
      grandTotal,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    });

    await tempOrder.save();

    //  Create Razorpay order
    const razorpayOrder = await createRazorpayOrder(grandTotal, `order_${tempOrder._id}`);

    res.json({
      success: true,
      order: razorpayOrder,
      tempOrderId: tempOrder._id.toString(),
    });
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create Razorpay order",
    });
  }
};






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

    const isRetryPayment = order.items && order.items.length > 0 && 
      order.items[0].productId && 
      (order.paymentStatus === "Failed" || (order.paymentStatus === "Pending" && order.razorpayPaymentId === null));

    if (isRetryPayment) {
    
      for (let item of order.items) {
        const productId = item.productId.toString ? item.productId.toString() : item.productId;
        const product = await Product.findById(productId);
        if (!product) {
          await Order.findByIdAndUpdate(tempOrderId, { paymentStatus: "Failed" });
          return res.status(400).json({ success: false, message: "Product not found" });
        }
        const variant = product.variants.id(item.variantId);
        if (!variant || variant.stock < item.quantity || variant.isBlocked) {
          await Order.findByIdAndUpdate(tempOrderId, { paymentStatus: "Failed" });
          return res.status(400).json({ success: false, message: "Some items are out of stock" });
        }
      }

      // Update stock for retry payment
      for (let item of order.items) {
        const productId = item.productId.toString ? item.productId.toString() : item.productId;
        const product = await Product.findById(productId);
        const variant = product.variants.id(item.variantId);
        variant.stock -= item.quantity;
        await product.save();
      }
    } else {
      // Handle new payment - use cart items
      const cartData = await Cart.findOne({ userId }).populate("items.productId");
      const cartItems = cartData ? cartData.items : [];
      
      if (cartItems.length === 0) {
        await Order.findByIdAndUpdate(tempOrderId, { paymentStatus: "Failed" });
        return res.status(400).json({ success: false, message: "Cart is empty" });
      }

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

      // Calculate final order items with proper offer and coupon discount
      let couponAmount = order.discount || 0;
      const subtotalBeforeDiscount = cartItems.reduce((sum, i) => sum + i.total, 0);
      const orderItems = await Promise.all(cartItems.map(async (item) => {
        const variant = item.productId.variants[item.variantIndex];
        const originalPrice = variant.price; 
        
        // Get offer discount
        const { discountPercent, appliedOffer } = await getProductOfferDiscount(item.productId);
        const offerDiscountAmount = discountPercent > 0 
          ? Math.round((originalPrice * discountPercent) / 100) 
          : 0;
          let check =Math.round((originalPrice * discountPercent) / 100) 
          console.log(check)
        const priceAfterOffer = originalPrice - offerDiscountAmount;
        
        // Calculate coupon discount on price after offer
        const couponDiscountPerUnit = couponAmount > 0 
          ? Math.round((item.total / subtotalBeforeDiscount) * couponAmount) / item.quantity 
          : 0;
        
        const finalPricePerUnit = priceAfterOffer - couponDiscountPerUnit;
        const totalDiscountPerUnit = offerDiscountAmount + couponDiscountPerUnit;
        
        return {
          productId: item.productId._id,
          variantId: variant._id,
          quantity: item.quantity,
          basePrice: originalPrice,
          discountAmount: totalDiscountPerUnit, 
          finalPrice: finalPricePerUnit,
          total: finalPricePerUnit * item.quantity,
          appliedOffer: appliedOffer ? appliedOffer.name : null, 
        };
      }));
      order.items = orderItems;
      order.subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
    }

    // Update order status
    order.paymentStatus = "Paid";
    order.orderStatus = "Confirmed";
    order.razorpayPaymentId = paymentId;
    await order.save();

    // Update coupon usage 
    if (order.appliedCoupon) {
      const appliedCoupon = await Coupon.findOne({ code: order.appliedCoupon });
      if (appliedCoupon) {
        const alreadyUsed = appliedCoupon.usedBy.some(usage => String(usage.userId) === String(userId));
        if (!alreadyUsed) {
          appliedCoupon.usedBy.push({ userId, usedAt: new Date() });
          await appliedCoupon.save();
        }
      }
    }

    // Clear cart after successful payment
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [], grandTotal: 0 } },
      { new: true }
    );

    res.json({ success: true, message: "Payment verified successfully", orderId: order._id.toString() });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ success: false, message: err.message || "Payment verification failed" });
  }
};




const retryPayment = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const orderId = req.params.id;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Verify order belongs to user
    if (String(order.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this order" });
    }

    if (order.paymentMethod !== "RAZORPAY") {
      return res.status(400).json({ success: false, message: "Only Razorpay orders can be retried" });
    }

    if (order.paymentStatus !== "Failed" && order.paymentStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "Only failed or pending payments can be retried" });
    }

   
    if (order.orderStatus === "Cancelled" && order.paymentStatus !== "Failed") {
      return res.status(400).json({ success: false, message: "Cannot retry payment for cancelled order" });
    }

    // Check stock availability
    const variantIdArray = order.items.map((ele) => {
      return {
        productId: ele.productId,
        variantId: ele.variantId,
        quantity: ele.quantity
      };
    });

    const sufficient = await isSufficient(variantIdArray);
    if (!sufficient) {
      order.orderStatus = 'Cancelled';
      order.items.forEach(item => {
        item.cancelStatus = 'Cancelled';
        item.cancelReason = "Cancelled Due to some Product are Out of Quantity";
      });
      await order.save();
      return res.status(400).json({ success: false, message: "Some Items are Out of Stock. Order Cancelled" });
    }

    // Reset order status for retry
    order.paymentStatus = "Pending";
    order.orderStatus = "Pending";
    order.razorpayPaymentId = null;
    
    // Reset any cancelled item statuses if order was previously cancelled
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        if (item.cancelStatus === "Cancelled") {
          item.cancelStatus = "Not Cancelled";
          item.cancelReason = null;
        }
      });
    }
    
    await order.save();

    // Create new Razorpay order
    const razorpayOrder = await createRazorpayOrder(order.grandTotal, `retry_${order._id}`);

    return res.json({ success: true, razorpayOrder, order });
  } catch (err) {
    console.error("Error retrying payment:", err);
    res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
  }
};



async function isSufficient(items) {
  try {
    const productIds = items.map((i) => i.productId);

    const products = await Product.find({ _id: { $in: productIds } }).lean();

    // Loop through each item and check stock
    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.productId.toString());
      if (!product) return false;

      const variant = product.variants.find(
        (v) => v._id.toString() === item.variantId.toString()
      );
      if (!variant) return false; 

      if (variant.stock < item.quantity) return false; 
    }

    return true; 
  } catch (err) {
    console.error("Error checking stock:", err);
    return false; 
  }
}



export default({
    createRazorpayOrderHandler,
    verifyRazorpayPayment,
     retryPayment


})