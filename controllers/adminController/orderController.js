import Order from "../../models/orderModel.js"
import HTTP_STATUS from "../../utils/responseHandler.js"

const getAdminOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin/orderManagement", { orders, currentPage: page, totalPages });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading orders");
  }
};


const getOrderdetail =  async (req, res)=>{
  try{
    
    const order = await Order.findById(req.params.id)
    .populate("userId", "name mobile")
    .populate("items.productId", "name images price");

    
    if(!order){
       return res.status(404).json({ success: false, message: "Order not found" });
    }
 res.json({ success: true, order });
  }catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}



// const updateOrderStatus = async (req, res) => {
//   try {

//     const { status } = req.body;
//     const { orderId } = req.params;

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ success: false, message: "Order not found" });
//     }

//     const currentStatus = order.orderStatus;

//     // Define valid transitions
//     const validTransitions = {
//       Pending: ["Confirmed", "Cancelled"],
//       Confirmed: ["Shipped", "Cancelled"],
//       Shipped: ["Out for Delivery", "Cancelled"],
//       "Out for Delivery": ["Delivered", "Cancelled"],
//       Delivered: [], // Final state
//       Cancelled: []  // Final state
//     };

    
//     if (!validTransitions[currentStatus].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot move from ${currentStatus} → ${status}`,
//       });
//     }

     
//     order.orderStatus = status;

//     // 🧾 Update paymentStatus rules
//     if (status === "Delivered" && order.paymentMethod === "COD") {
//       order.paymentStatus = "Paid";
//     } else if (status === "Cancelled" && order.paymentStatus === "Pending") {
//       order.paymentStatus = "Failed";
//     }

//     await order.save();

//     res.json({ success: true, message: "Order status updated successfully!" });
//   } catch (error) {
//     console.error("Error updating order status:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

const updateOrderStatus = async (req, res) => {
  try {
    
    const { orderId } = req.params;
    const { status } = req.body;
    const newStatus = status;


    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "Order not found",
      });
    }

    const statusOrder = [
      "Pending",
      "Confirmed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
    ];

    const currentIndex = statusOrder.indexOf(order.orderStatus);
    const newIndex = statusOrder.indexOf(newStatus);

    
    if (newStatus !== "Cancelled" && newIndex === -1) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid order status",
      });
    }

    //
    if (newIndex < currentIndex && newStatus !== "Cancelled") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Cannot move order status backward",
      });
    }

    // 🟠 Cancel logic
    if (newStatus === "Cancelled") {
      if (order.orderStatus !== "Pending") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Only pending orders can be cancelled",
        });
      }
    }

    // 🟢 Restrict large jumps (must go step-by-step)
    if (
      newStatus !== "Cancelled" &&
      newIndex - currentIndex > 1
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Order status must progress step by step",
      });
    }

    
    if (
      order.orderStatus === "Pending" &&
      newStatus !== "Cancelled" &&
      order.paymentMethod !== "COD" &&
      order.paymentStatus !== "Paid"
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Non-COD orders must be paid before confirmation",
      });
    }

    
    order.orderStatus = newStatus;

    if (newStatus === "Delivered" && order.paymentMethod === "COD") {
      order.paymentStatus = "Paid";
    }

    // 🛑 Handle cancellation refunds and stock restore
    if (newStatus === "Cancelled") {
      if (!(order.paymentMethod === "RAZORPAY" && order.paymentStatus === "Failed")) {
        // restore stock
        for (let item of order.items) {
          await Product.updateOne(
            { _id: item.productId, "variants._id": item.variantId },
            { $inc: { "variants.$.stock": item.quantity } }
          );
        }
      }

      order.items.forEach((item) => {
        item.cancelStatus = "Cancelled";
        item.cancelReason = "Cancelled By Admin";
      });

      // refund if paid and not COD
      if (order.paymentMethod !== "COD" && order.paymentStatus === "Paid") {
        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
          wallet = new Wallet({ userId: order.userId, balance: 0 });
        }

        const refundAmount = order.grandTotal;
        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: "Credit",
          amount: refundAmount,
          description: `Refund for Admin Cancelled Order - Order #${order.orderId}`,
          orderId: order._id,
        });

        await wallet.save();
      }
    }

    await order.save();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Order status updated successfully",
    });
  } catch (err) {
    console.error("Error in updateOrderStatus:", err);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};







export default({getAdminOrders,
  getOrderdetail,
  updateOrderStatus
})
