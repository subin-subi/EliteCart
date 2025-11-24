import Order from "../../models/orderModel.js"; 


const getDashboard = async (req, res) => {
  try {
    const {
      period = "yearly",
      customDate,
      customMonth,
      customYear,
      customWeekStart,
    } = req.query;

    let startDate, endDate;
    const now = new Date();

    switch (period) {
      case "daily":
        if (customDate) {
          startDate = new Date(customDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(customDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        }
        break;

      case "weekly":
        if (customWeekStart) {
          startDate = new Date(customWeekStart);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
        } else {
          const day = now.getDay();
          const diffToMonday = (day + 6) % 7;
          startDate = new Date(now);
          startDate.setDate(now.getDate() - diffToMonday);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
        }
        break;

      case "monthly":
        if (customMonth && customYear) {
          startDate = new Date(customYear, customMonth - 1, 1);
          endDate = new Date(customYear, customMonth, 1);
        } else {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }
        break;

      case "yearly":
      default:
        if (customYear) {
          startDate = new Date(customYear, 0, 1);
          endDate = new Date(parseInt(customYear) + 1, 0, 1);
        } else {
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
        }
        break;
    }

    // Fetch orders within the selected date range
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lt: endDate },
      orderStatus: { $in: ["Delivered"] },
    })
      .populate({
  path: "items.productId",
  populate: [
    { path: "category", select: "name" },
    { path: "brand", select: "name" },
  ],
})

.lean();

    //  Basic metrics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.grandTotal || 0), 0);
    const totalOrders = orders.length;
    const totalProductsSold = orders.reduce(
      (sum, order) => sum + order.items.reduce((s, i) => s + i.quantity, 0),
      0
    );
    const uniqueCustomers = new Set(orders.map((o) => o.userId?.toString())).size;

    //  Best Selling Products
    const productSales = {};

orders.forEach((order) => {
  order.items.forEach((item) => {
    const productId = item.productId?._id?.toString();
    const productName = item.productId?.name || "Unknown Product";

    if (!productSales[productId]) {
      productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
    }

 
    const itemPrice = item.productId?.variants?.[0]?.price || 0;
 

    // Update totals
    productSales[productId].quantity += item.quantity || 0;
    productSales[productId].revenue += itemPrice * (item.quantity || 0);
  });
});

// Get top 10 best-selling products
const bestSellingProducts = Object.values(productSales)
  .sort((a, b) => b.quantity - a.quantity)
  .slice(0, 10);



//  Best Selling Brands
const brandSales = {};

orders.forEach((order) => {
  order.items.forEach((item) => {
    const brandName = item.productId?.brand?.name || "Unbranded";

    if (!brandSales[brandName]) {
      brandSales[brandName] = { name: brandName, quantity: 0, revenue: 0 };
    }

    const itemPrice = item.productId?.variants?.[0]?.price || 0;

    brandSales[brandName].quantity += item.quantity || 0;
    brandSales[brandName].revenue += itemPrice * (item.quantity || 0);
  });
});

const bestSellingBrands = Object.values(brandSales)
  .sort((a, b) => b.quantity - a.quantity)
  .slice(0, 10);





    //  Best Selling Categories (Fixed)
const categorySales = {};

orders.forEach((order) => {
  order.items.forEach((item) => {
    // Get category name safely
    const categoryName = item.productId?.category?.name || "Uncategorized";

    // Initialize category entry if not present
    if (!categorySales[categoryName]) {
      categorySales[categoryName] = { name: categoryName, quantity: 0, revenue: 0 };
    }

    
    const itemPrice = item.productId?.variants?.[0]?.price ||  0;


    // Update totals
    categorySales[categoryName].quantity += item.quantity || 0;
    categorySales[categoryName].revenue += itemPrice * (item.quantity || 0);
  });
});



    const bestSellingCategories = Object.values(categorySales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    
    const chartData = {};
    let chartLabels = [];
    let chartOrdersData = [];
    let chartRevenueData = [];

    if (period === "daily") {
      for (let hour = 0; hour < 24; hour += 2) {
        const label = `${hour.toString().padStart(2, "0")}:00 - ${(hour + 2)
          .toString()
          .padStart(2, "0")}:00`;
        chartLabels.push(label);
        chartData[hour] = { orders: 0, revenue: 0 };
      }
      orders.forEach((o) => {
        const hour = new Date(o.createdAt).getHours();
        const group = Math.floor(hour / 2) * 2;
        chartData[group].orders += 1;
        chartData[group].revenue += o.grandTotal;
      });
      chartOrdersData = chartLabels.map((_, i) => chartData[i * 2].orders);
      chartRevenueData = chartLabels.map((_, i) => chartData[i * 2].revenue);
    } else if (period === "weekly") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.forEach((_, i) => (chartData[i] = { orders: 0, revenue: 0 }));
      orders.forEach((o) => {
        const day = new Date(o.createdAt).getDay();
        chartData[day].orders += 1;
        chartData[day].revenue += o.grandTotal;
      });
      chartLabels = days;
      chartOrdersData = days.map((_, i) => chartData[i].orders);
      chartRevenueData = days.map((_, i) => chartData[i].revenue);
    } else if (period === "monthly") {
      const daysInMonth = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + 1,
        0
      ).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        chartData[d] = { orders: 0, revenue: 0 };
      }
      orders.forEach((o) => {
        const d = new Date(o.createdAt).getDate();
        chartData[d].orders += 1;
        chartData[d].revenue += o.grandTotal;
      });
      chartLabels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
      chartOrdersData = chartLabels.map((d) => chartData[parseInt(d)].orders);
      chartRevenueData = chartLabels.map((d) => chartData[parseInt(d)].revenue);
    } else if (period === "yearly") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      months.forEach((_, i) => (chartData[i] = { orders: 0, revenue: 0 }));
      orders.forEach((o) => {
        const m = new Date(o.createdAt).getMonth();
        chartData[m].orders += 1;
        chartData[m].revenue += o.grandTotal;
      });
      chartLabels = months;
      chartOrdersData = months.map((_, i) => chartData[i].orders);
      chartRevenueData = months.map((_, i) => chartData[i].revenue);
    }

res.render("admin/dashboard", {
  period,
  customDate,
  customMonth,
  customYear,
  customWeekStart,
  metrics: {
    revenue: totalRevenue,
    orders: totalOrders,
    productsSold: totalProductsSold,
    customers: uniqueCustomers,
  },
  bestSellingProducts,
  bestSellingCategories,
  bestSellingBrands,
  chartData: {
    labels: chartLabels,
    orders: chartOrdersData,
    revenue: chartRevenueData,
  },
});

  } catch (err) {
    console.error("Dashboard error:", err);
   res.render("admin/dashboard", {
  period: 'yearly',
  customDate: '',
  customMonth: '',
  customYear: '',
  customWeekStart: '',
  metrics: { revenue: 0, orders: 0, productsSold: 0, customers: 0 },
  bestSellingProducts: [],
  bestSellingCategories: [],
  chartData: { labels: [], orders: [], revenue: [] }
});

  }
};



export default { getDashboard };