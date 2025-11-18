import Order from "../../models/orderModel.js"
import HTTP_STATUS from "../../utils/responseHandler.js"
import Wallet from "../../models/walletModel.js"
import User from "../../models/userModel.js"

const getAdminOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const priceSort = req.query.priceSort || "";
    const dateSort = req.query.dateSort || "";
    const returnStatus = req.query.returnStatus || "";

    let filter = {};

    // Search logic (by orderId or user's name)
    if (search) {
      const users = await User.find(
        { name: { $regex: search, $options: "i" } },
        "_id"
      );

      filter.$or = [
        { orderId: { $regex: search, $options: "i" } },
        ...(users.length > 0
          ? [{ userId: { $in: users.map((u) => u._id) } }]
          : []),
      ];
    }

    // Return status filter (inside items array)
    if (returnStatus) {
      filter.items = { $elemMatch: { returnStatus } };
    }

    // Sorting logic
    let sortOptions = {};
    if (priceSort) {
      sortOptions.grandTotal = priceSort === "asc" ? 1 : -1;
    } else if (dateSort) {
      sortOptions.createdAt = dateSort === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    // Pagination + sorting + filters
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    // Find orders with user info populated
    const orders = await Order.find(filter)
      .populate("userId", "name email mobile") // get person details
      .populate("items.productId", "name")    // get product info if needed
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    //  filter items inside each order to only those with return requests
    const ordersWithReturnItems = orders.map(order => {
      const returnItems = order.items.filter(item => item.returnStatus === "Requested");
      return {
        ...order.toObject(),
        items: returnItems
      };
    });

    res.render("admin/orderManagement", {
      orders: ordersWithReturnItems,
      currentPage: page,
      totalPages,
      search,
      priceSort,
      dateSort,
      returnStatus,
    });
  } catch (error) {
    console.error("Error loading orders:", error);
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

   
    const allCancelled = order.items.every(
      (item) => item.cancelStatus === "Cancelled"
    );
    if (order.orderStatus === "Cancelled" || allCancelled) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "This order has been cancelled. No further changes allowed.",
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

   
    if (newIndex < currentIndex && newStatus !== "Cancelled") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Cannot move order status backward",
      });
    }

    
    if (newStatus === "Cancelled" && order.orderStatus !== "Pending") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Only pending orders can be cancelled",
      });
    }

    
    if (newStatus !== "Cancelled" && newIndex - currentIndex > 1) {
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

    
    if (newStatus === "Cancelled") {
      if (!(order.paymentMethod === "RAZORPAY" && order.paymentStatus === "Failed")) {
        // Restore stock
        for (let item of order.items) {
          await Product.updateOne(
            { _id: item.productId, "variants._id": item.variantId },
            { $inc: { "variants.$.stock": item.quantity } }
          );
        }
      }

    
      order.items.forEach((item) => {
        item.cancelStatus = "Cancelled";
        item.cancelReason = "Cancelled by Admin";
      });

      // Refund logic
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


const updateReturnStatus = async (req, res) => {
  try {
    const { orderId, productId, newStatus } = req.body;

    const order = await Order.findById(orderId).populate("userId");
    if (!order) return res.json({ success: false, message: "Order not found" });

    const item = order.items.find(i => i.productId.toString() === productId);
    if (!item) return res.json({ success: false, message: "Product not found in order" });

  
    item.returnStatus = newStatus;

    
    if (newStatus === "Approved") {
     
      const refundAmount = Number(item.finalPrice) * Number(item.quantity);

      const userId = order.userId._id;
      let wallet = await Wallet.findOne({ user: userId });

     
      if (!wallet) {
        wallet = new Wallet({
          user: userId,
          balance: 0,
          transactions: [],
        });
      }

      
      wallet.transactions.push({
        type: "Credit",
        amount: refundAmount,
        description: `Refund for returned product from Order ${order.orderId}`,
        date: new Date(),
      });

      wallet.balance += refundAmount;
      await wallet.save();


      item.refundAmount = refundAmount;
    }

    await order.save();

    res.json({
      success: true,
      message: `Return status updated to ${newStatus}${
        newStatus === "Approved" ? " and refund processed" : ""
      }`,
    });
  } catch (error) {
    console.error("❌ Error updating return status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



export default({
  getAdminOrders,
  getOrderdetail,
  updateOrderStatus,
  updateReturnStatus ,

})
