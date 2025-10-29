import Order from "../../models/orderModel.js"


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

export default({getAdminOrders})
