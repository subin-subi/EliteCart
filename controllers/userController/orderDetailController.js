import User from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";


const getOrderDetail = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).render("error", { message: "User not found" });
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
    res.status(500).render("error", { message: "Failed to load order details" });
  }
};


const cancelFullOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    if (!["Pending", "Confirmed", "Processing"].includes(order.orderStatus)) {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled now." });
    }

    // Update order status
    order.orderStatus = "Cancelled";

    // Update each item cancel status and reason
    order.items = order.items.map(item => ({
      ...item.toObject(),
      cancelStatus: "Cancelled",
      cancelReason: reason
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

    await order.save();

    return res.json({
      success: true,
      message: "Order cancelled and stock updated successfully"
    });
  } catch (error) {
    console.error("Error cancelling full order:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const cancelIndividualItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user;

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item)
      return res.status(404).json({ success: false, message: "Item not found" });

    if (item.cancelStatus === "Cancelled")
      return res.status(400).json({ success: false, message: "Item already cancelled" });

    if (!["Pending", "Confirmed", "Processing"].includes(order.orderStatus))
      return res.status(400).json({ success: false, message: "Cannot cancel at this stage" });

    // ✅ Mark item as cancelled
    item.cancelStatus = "Cancelled";
    item.cancelReason = reason;

    // ✅ Restore product stock
    await Product.updateOne(
      { _id: item.productId, "variants._id": item.variantId },
      { $inc: { "variants.$.stock": item.quantity } }
    );

    // ✅ Safely adjust grandTotal
    const itemTotal = Number(item.total) || 0;
    order.grandTotal = Math.max(0, Number(order.grandTotal || 0) - itemTotal);

    // ✅ Auto-cancel order if all items cancelled
    const allCancelled = order.items.every(i => i.cancelStatus === "Cancelled");
    if (allCancelled) order.orderStatus = "Cancelled";

    await order.save();

    return res.json({
      success: true,
      message: "Item cancelled and stock restored successfully",
    });

  } catch (error) {
    console.error("Error cancelling item:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const requestReturnItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user;

   
    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first" });
    }

    
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Reason must be at least 10 characters long" });
    }

  
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }


    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in order" });
    }

   
    if (item.returnStatus !== "Not Requested") {
      return res.status(400).json({ success: false, message: "Return already requested for this item" });
    }

    
    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({ success: false, message: "You can only request a return for delivered orders" });
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
    return res.status(500).json({ success: false, message: "Server error" });
  }
};




export default ({ 
  getOrderDetail ,
  cancelFullOrder,
  cancelIndividualItem,
  requestReturnItem,
  

});
