import User from "../../models/userModel.js";
import Order from "../../models/orderModel.js";
import Product from "../../models/productModel.js";

const getOrderDetail = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    const page = parseInt(req.query.page) || 1; // current page
    const limit = 5; // number of orders per page
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);

    // Get total number of orders for pagination
    const totalOrders = await Order.countDocuments({ userId });

    // Fetch paginated orders
    const orders = await Order.find({ userId })
      .populate({
        path: "items.productId",
        select: "name variants",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / limit);

    res.render("user/orderDetail", {
      user,
      orders,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", { message: "Failed to load order details" });
  }
};


export default ({ getOrderDetail });
