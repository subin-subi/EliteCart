import User from "../../models/userModel.js";
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Product from "../../models/productModel.js";
import Order from "../../models/orderModel.js"
import Coupon from "../../models/couponModel.js"
import { console } from "inspector";
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

    console.log("helo")
    res.render("user/checkout", {
      user,
      cart: cartItems,
      addresses,
      total: grandTotal,
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





const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { paymentMethod, addressId } = req.body;

    const address = await Address.findById(addressId);
    if (!address) {
      return res.json({ success: false, message: "Invalid address." });
    }

   
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    let subtotal = 0;

    
    const items = [];

    for (const i of cart.items) {
      const product = i.productId;
      const variant = product.variants[i.variantIndex];

      if (!variant) {
        throw new Error(`Variant not found for product ${product._id}`);
      }

     
      if (variant.stock < i.quantity) {
        return res.json({
          success: false,
          message: `Not enough stock for ${product.name} (Available: ${variant.stock})`,
        });
      }

      const variantId = variant._id;
      const basePrice = variant.price;
      const discount = variant.discountPrice
        ? variant.price - variant.discountPrice
        : 0;
      const finalPrice = variant.discountPrice || variant.price;
      const total = finalPrice * i.quantity;

      subtotal += total;


      items.push({
        productId: product._id,
        variantId,
        quantity: i.quantity,
        basePrice,
        discountAmount: discount,
        finalPrice,
        total,
        appliedOffer: discount > 0 ? "Product Discount" : null,
      });

      
      await Product.updateOne(
        { _id: product._id, "variants._id": variantId },
        { $inc: { "variants.$.stock": -i.quantity } }
      );
    }

   
    const shippingCharge = subtotal >= 1000 ? 0 : 50;
    const grandTotal = subtotal + shippingCharge;

    
    const order = new Order({
      userId,
      items,
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
      paymentMethod,
      subtotal,
      shippingCharge,
      grandTotal,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
    });

    await order.save();

    
    await Cart.deleteOne({ userId });

    res.json({
      success: true,
      message: "Order placed successfully!",
      orderId: order._id,
      shippingCharge,
      grandTotal,
    });
  } catch (error) {
    console.log("❌ Error placing order:", error);
    res.json({ success: false, message: "Error placing order" });
  }
};


const createRazorpayOrderForUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { cart, selectedAddressId, paymentMethod, coupon, subtotal } = req.body;
    console.log( cart, selectedAddressId, paymentMethod, coupon, subtotal)

    // 1. Validate address
    if (!selectedAddressId) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "You didn't select an address"
      });
    }

    const address = await Address.findById(selectedAddressId);
    if (!address) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Address not found"
      });
    }

    // 2. COD disabled if subtotal > 1000
    if (subtotal > 1000 && paymentMethod === "cod") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "COD is not available for orders above ₹1000"
      });
    }

    // 3. Razorpay auto-selected if subtotal > 1000
    let finalPaymentMethod = paymentMethod;
    if (subtotal > 1000) {
      finalPaymentMethod = "razorpay";
    }

    // 4. Validate cart items
    const cartItems = cart || [];
    if (cartItems.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Your cart is empty"
      });
    }

    // 5. Coupon validation and calculation
    let appliedCoupon = null;
    let couponAmount = 0;

    if (coupon) {
      const couponData = await Coupon.findOne({ code: coupon.toUpperCase(), isActive: true, isNonBlocked: true });

      if (!couponData) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Invalid or inactive coupon"
        });
      }

      const now = new Date();
      if (now < couponData.startDate || now > couponData.expiryDate) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Coupon is expired or not yet active"
        });
      }

      if (subtotal < couponData.minPurchaseAmount) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Minimum purchase amount for this coupon is ₹${couponData.minPurchaseAmount}`
        });
      }

      const userUsageCount = couponData.usedBy.filter(u => String(u.userId) === String(userId)).length;
      if (userUsageCount >= couponData.perUserLimit) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "You have already used this coupon"
        });
      }

      // Calculate discount
      if (couponData.discountType === "percentage") {
        couponAmount = (subtotal * couponData.discountValue) / 100;
        if (couponData.maxDiscountAmount && couponAmount > couponData.maxDiscountAmount) {
          couponAmount = couponData.maxDiscountAmount;
        }
      } else if (couponData.discountType === "flat") {
        couponAmount = couponData.discountValue;
      }

      appliedCoupon = couponData;
    }

    // 6. Prepare Order Items
    const orderItems = cartItems.map(item => ({
      productId: item.productId._id,
      variantId: item.variant._id,
      quantity: item.quantity,
      basePrice: item.variant.basePrice,
      finalPrice: item.variant.price,
      total: item.variant.price * item.quantity,
    }));

    // 7. Calculate totals
    const shippingCharge = subtotal > 1000 ? 0 : 50;
    const grandTotal = subtotal - couponAmount + shippingCharge;

    // 8. Create temporary order
    const order = new Order({
      userId,
      items: orderItems,
      address: {
        name: address.name,
        house: address.house,
        street: address.street,
        city: address.city,
        state: address.state,
        country: address.country,
        pincode: address.pincode,
        mobile: address.mobile,
      },
      paymentMethod: finalPaymentMethod,
      paymentStatus: "Pending",
      orderStatus: "Pending",
      subtotal,
      discount: couponAmount,
      shippingCharge,
      grandTotal,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
    });

    await order.save();

    // 9. Create Razorpay order if Razorpay selected
    let razorpayOrder = null;
    if (finalPaymentMethod === "razorpay") {
      razorpayOrder = await createRazorpayOrder(grandTotal, order._id.toString());
    }

    // 10. Reduce stock
    for (let item of cartItems) {
      await Product.updateOne(
        { _id: item.productId._id, "variants._id": item.variant._id },
        { $inc: { "variants.$.stock": -item.quantity } }
      );
    }

    // 11. Mark coupon as used
    if (appliedCoupon) {
      await Coupon.updateOne(
        { _id: appliedCoupon._id },
        { $push: { usedBy: { userId, usedAt: new Date() } } }
      );
    }

    // 12. Clear user cart
    await Cart.deleteMany({ userId });

    // ✅ Success response
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      paymentMode: finalPaymentMethod,
      order: razorpayOrder,
      tempOrderId: order._id,
      message: finalPaymentMethod === "razorpay" ? "Razorpay order created" : "Order placed successfully"
    });

  } catch (err) {
    console.error("Error in createRazorpayOrderForUser:", err);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};




// export const verifyRazorpayPayment = async (req, res) => {
//   try {
//     const { orderId, paymentId, signature, tempOrderId } = req.body;


//     const order = await Order.findById(tempOrderId);
//     if (!order) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
//     if(order.orderStatus==="Cancelled"){
//       return res.status(HTTP_STATUS.CONFLICT).json({ success: false, message: "Order was Cancelled" });
//     }
//     if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
      
//       order.paymentStatus = "Failed";
//       await order.save();
//       return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Payment verification failed" });
//     }

//     order.paymentStatus = "Paid";
//     order.razorpayPaymentId = paymentId;
//     order.orderStatus = "Pending";
//     await order.save();

//     res.json({ success: true, message: "Payment successful", orderId: order._id });
//   } catch (err) {
//     console.error("Error in verifyRazorpayPayment:", err);
//     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
//   }
// };



// export const updateOrderFailedStatus = async (req,res)=>{
//   try{
//     const id = req.params.id;
   
//     const order = await Order.findById(id);
//     if(!order) return res.status(HTTP_STATUS.NOT_FOUND).json({success:false});
//     order.paymentStatus = "Failed";
//     await order.save();
//     for (let item of order.items) {
//         await Product.updateOne(
//             { _id: item.productId, "variants._id": item.variantId },
//             { $inc: { "variants.$.stock": item.quantity } }
//         );
//     }
//     return res.status(HTTP_STATUS.OK).json({success:true});
//   }catch(err){
//     console.log(err);
//     return res.status(HTTP_STATUS.NOT_FOUND).json({success:false});
//   }
// }


// export const userOrderFailurePage = async(req,res)=>{
//   try{
//       const id = req.params.id;

//       const order = await Order.findById(id); 
//       if(!order || String(order.userId) !== String(req.user._id)) {
//           return res.render("error.ejs");
//       }
      
//       return res.render("user-views/user-account/user-profile/user-failed.ejs",{
//           order
//       })
//   }catch(err){
//       console.log(err);
//       return res.render("error.ejs")
//   }
// };

// export const retryPayment = async (req, res) => {
//   try {
//     const orderId = req.params.id;
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
//     }
//     if (order.paymentMethod !== "RAZORPAY") {
//       return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Only Razorpay orders can be retried" });
//     }
//     if (order.paymentStatus !== "Failed") {
//       return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Only failed payments can be retried" });
//     }
//     if (order.orderStatus === "Cancelled" ) {
//       return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "You have already cancelled the order" });
//     };

//     const variantIdArray = order.items.map((ele)=>{
//       return {
//         productId:ele.productId,
//         variantId:ele.variantId,
//         quantity:ele.quantity
//       }
//     });
//     const sufficient = await isSufficient(variantIdArray);
//     if(!sufficient){
//         order.orderStatus = 'Cancelled';
//         order.items.forEach(item => {
//             item.cancelStatus = 'Cancelled';
//             item.cancelReason = "Cancelled Due to some Product are Out of Quantity";
//         });
//         await order.save();
//       return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Some Items are Out of Quantity,Order Cancelled" });
//     }
//         // 9. Reduce stock for each variant
//     for (let item of variantIdArray) {
//       await Product.updateOne(
//         { _id: item.productId, "variants._id": item.variantId },
//         { $inc: { "variants.$.stock": -item.quantity } }
//       );
//     }

//     // Create new Razorpay order
//     const razorpayOrder = await createRazorpayOrder(order.grandTotal, order.orderId.toString());

//     return res.json({ success: true, razorpayOrder, order });
//   } catch (err) {
//     console.error("Error retrying payment:", err);
//     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
//   }
// };




export default {
  getCartCheckout,
  selectAddres,
  placeOrder,
  createRazorpayOrderForUser
 };
