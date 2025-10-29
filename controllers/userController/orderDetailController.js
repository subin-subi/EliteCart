import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.session.user; // assuming user session stores user ID

    if (!userId) {
      return res.redirect("/login");
    }

    // Fetch user's orders, latest first
    const orders = await Order.find({ userId })
      .populate("items.productId", "name images") // populate product details
      .sort({ createdAt: -1 });

    // Format data for EJS
    const formattedOrders = orders.map(order => {
      return {
        _id: order._id,
        orderId: order.orderId,
        items: order.items,
        totalAmount: order.grandTotal,
        status: order.orderStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      };
    });

    res.render("user/myOrders", { orders: formattedOrders });
  } catch (error) {
    console.error("Error loading orders:", error);
    res.status(500).render("error", { message: "Failed to load orders" });
  }
};
