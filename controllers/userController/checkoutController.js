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
        const id = req.params.id;
        
        const order = await Order.findById(id); 
        if(!order || String(order.userId) !== String(req.user._id)) {
            return res.render("error.ejs");
        }
        
        return res.render("user/userSuccess",{
            order
        })
    }catch(err){
        console.log(err);
        return res.render("error.ejs")
    }
}

const userOrderCOD = async (req, res) => {
  
  try {
      console.log("COD order payload:", req.body);
    const userId = req.user.id;
    const { cart, selectedAddressId, paymentMethod,coupon } = req.body;
    console.log("COD order data:", { cart, selectedAddressId, paymentMethod, coupon });

    
    // 1. Validate payment method

    if(!selectedAddressId){
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "You didn't selected a Address" });
    }

    if (paymentMethod !== "cod") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Only Cash On Delivery is Applicable" });
    }

    // 2. Validate address
    const address = await Address.findById(selectedAddressId);
    if (!address) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Address Not Found" });
    }

   
    const { cartItems, subtotal } = await cartService.getUserCartFunction(userId);
    if (!cartItems.length) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Cart is Empty" });
    }

    let appliedCoupon=null;
    if(coupon){
        appliedCoupon = await coupenDetails(coupon,subtotal,userId);
    }
    // 4. Validate user cart IDs vs DB cart IDs
    const userVariantIds = cart.map(item => String(item.variant._id)).sort();
    const dbVariantIds = cartItems.map(item => String(item.variant._id)).sort();

    const allMatch =
      userVariantIds.length === dbVariantIds.length &&
      userVariantIds.every((id, index) => id === dbVariantIds[index]);

    if (!allMatch) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Admin modified your cart items. Please refresh your cart." });
    }

    // 5. Check stock availability
    const outOfStockItems = [];
    for (let item of cartItems) {
      const stock = await getVariantStock(item.productId._id, item.variant._id);
      if (stock < item.quantity) {
        outOfStockItems.push(`${item.productId.name} (${item.variant.volume}ml)`);
      }
    }

    if (outOfStockItems.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Some items are out of stock",
        outOfStockItems
      });
    }
    
    var couponAmount = 0;
    if(appliedCoupon){
        if(appliedCoupon.type==="PERCENTAGE"){
            couponAmount = appliedCoupon.discount * subtotal/100;
        }else{
            couponAmount = appliedCoupon.discount;
        }
    }else{
        couponAmount = 0
    }
    // 6. Prepare Order Items
    const orderItems = cartItems.map((item) => {

    const itemCouponDis = (item.itemTotal/subtotal)*couponAmount;
    const roundedItemDis = Math.round(itemCouponDis);
    const discountPerUnit = roundedItemDis/item.quantity;
    return {
      productId: item.productId._id,
      variantId: item.variant._id,
      quantity: item.quantity,
      basePrice: item.variant.basePrice,
      discountAmount: discountPerUnit, // coupon discount per item
      finalPrice: item.variant.price - discountPerUnit, // No discount applied
      total: item.variant.price * item.quantity - roundedItemDis ,
      appliedOffer: appliedCoupon ? appliedCoupon.code : null, //coupon offer id
    }
    }
    
);

    // 7. Calculate totals
    const discount = couponAmount; // Apply coupon logic if needed
    const shippingCharge = subtotal >1000 ? 0 :  50; // Add shipping logic if needed
    const grandTotal = subtotal - discount + shippingCharge;

    // 8. Create Order
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
        mobile: address.mobile
      },
      paymentMethod: "COD",
      paymentStatus: "Pending",
      orderStatus: "Pending",
      subtotal,
      discount,
      shippingCharge,
      grandTotal,
      appliedCoupon:  appliedCoupon ? appliedCoupon.code : null
    });

    await order.save();

    // 9. Reduce stock for each variant
    for (let item of cartItems) {
      await Product.updateOne(
        { _id: item.productId._id, "variants._id": item.variant._id },
        { $inc: { "variants.$.stock": -item.quantity } }
      );
    }
    if(appliedCoupon){
        await Coupon.updateOne({code:appliedCoupon.code},{
            $addToSet:{usedBy:userId}
        })
    }
    // 10. Clear user cart
    await Cart.deleteMany({userId});

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
      redirect:`/user-oder/oder-status/${order._id}`
    });

  } catch (err) {
    console.error("Error in userOrder:", err);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
  }
};




export default {
  getCartCheckout,
  selectAddres,
  userOrderSuccessPage,
  userOrderCOD
 
  
 };
