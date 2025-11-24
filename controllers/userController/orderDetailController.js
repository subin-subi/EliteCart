import User from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";
import Wallet from "../../models/walletModel.js";
import HTTP_STATUS from "../../utils/responseHandler.js";

const getOrderDetail = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).render("error", { message: "User not found" });
    }

    
    const totalOrders = await Order.countDocuments({ userId });

    
    const orders = await Order.find({ userId })
      .populate({
        path: "items.productId",
        select: "name variants images", 
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); 

  
    const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);

    
    res.render("user/orderDetail", {
      user,
      orders,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(" Error in getOrderDetail:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("error", { message: "Failed to load order details" });
  }
};


const cancelFullOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
    }

    // Check if already cancelled
    if (order.orderStatus === "Cancelled") {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order already cancelled" });
    }

    // Only allow cancel if still pending/processing
    if (!["Pending", "Confirmed", "Processing"].includes(order.orderStatus)) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order cannot be cancelled now." });
    }

    // Refundable only if payment is Razorpay or Wallet
    const refundable = ["RAZORPAY", "WALLET"].includes(order.paymentMethod);
    let totalRefund = 0;

    // Calculate refund for prepaid orders
    if (refundable) {
      totalRefund = order.grandTotal; // refund total paid amount (already includes discounts/offers)
    }

    // Update all items cancel status
    order.items = order.items.map(item => ({
      ...item.toObject(),
      cancelStatus: "Cancelled",
      cancelReason: reason,
    }));

    // Restore stock for all variants
    await Promise.all(
      order.items.map(item =>
        Product.updateOne(
          { _id: item.productId, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": item.quantity } }
        )
      )
    );

    // If prepaid, refund to wallet
    if (refundable && totalRefund > 0) {
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
      }

      wallet.balance += totalRefund;
      wallet.transactions.push({
        type: "Credit",
        amount: totalRefund,
        description: `Refund for cancelled order ${order.orderId}`,
      });

      await wallet.save();
    }

    // Update order status
    order.orderStatus = "Cancelled";
    await order.save();

    res.json({
      success: true,
      message: refundable
        ? `Order cancelled successfully. ₹${totalRefund.toFixed(2)} refunded to wallet.`
        : "Order cancelled successfully (COD - no refund needed).",
    });
  } catch (error) {
    console.error("Error cancelling full order:", error);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};


const cancelIndividualItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item)
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Item not found" });

    if (item.cancelStatus === "Cancelled")
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Item already cancelled" });

    // Only allow cancellation if order is up to "Out for Delivery"
    const allowedStatuses = ["Pending", "Confirmed", "Shipped", "Out for Delivery"];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Cannot cancel at this stage",
      });
    }

    
    item.cancelStatus = "Cancelled";
    item.cancelReason = reason;

    
    await Product.updateOne(
      { _id: item.productId, "variants._id": item.variantId },
      { $inc: { "variants.$.stock": item.quantity } }
    );

    
    const itemTotal = Number(item.finalPrice * item.quantity);


    if (order.paymentMethod !== "COD" || order.orderStatus === "Delivered") {
      let wallet = await Wallet.findOne({ user: userId });

      if (!wallet) {
        wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
      }

      wallet.balance += itemTotal;
      wallet.transactions.push({
        type: "Credit",
        amount: itemTotal,
        description: `Refund for cancelled item from Order ${order.orderId}`,
      });

      await wallet.save();
      item.refundAmount = itemTotal;
    }

    
    order.grandTotal = Math.max(0, order.grandTotal - itemTotal);

    
    const allCancelled = order.items.every(i => i.cancelStatus === "Cancelled");
    if (allCancelled) order.orderStatus = "Cancelled";

    await order.save();

    return res.json({
      success: true,
      message:
        order.paymentMethod !== "COD" || order.orderStatus === "Delivered"
          ? "Item cancelled and refund added to wallet"
          : "Item cancelled successfully (COD - no refund needed)",
    });

  } catch (error) {
    console.error("❌ Error cancelling item:", error);
    return  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};



const requestReturnItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user;

   
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Please log in first" });
    }

    
    if (!reason || reason.trim().length < 10) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Reason must be at least 10 characters long" });
    }

  
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
    }


    const item = order.items.id(itemId);
    if (!item) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Item not found in order" });
    }

   
    if (item.returnStatus !== "Not Requested") {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Return already requested for this item" });
    }

    
    if (order.orderStatus !== "Delivered") {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "You can only request a return for delivered orders" });
    }

 
    item.returnStatus = "Requested";
    item.returnReason = reason.trim();
    item.returnRequestDate = new Date();

    await order.save();

    return res.json({
      success: true,
      message: "Return request submitted successfully. Admin will review it soon."
    });

  } catch (error) {
    console.error("Error requesting return:", error);
    return  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};




export default ({ 
  getOrderDetail ,
  cancelFullOrder,
  cancelIndividualItem,
  requestReturnItem,
  

});
