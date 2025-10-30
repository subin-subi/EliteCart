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


export default ({ getOrderDetail });
