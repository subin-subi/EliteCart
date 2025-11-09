import Order from "../../models/orderModel.js";
import PDFDocument from "pdfkit"
import HTTP_STATUS from "../../utils/responseHandler.js";
import ExcelJS from "exceljs";





const getSalesReport = async (req, res) => {
  try {
    const {
      range,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    let query = {}; // Default: fetch all
    let start = null;
    let end = null;

    // If range or dates are selected, apply filter
    if (range || startDate || endDate) {
      const filter = buildDateFilter(range || "custom", startDate, endDate);
      query = filter.query;
      start = filter.start;
      end = filter.end;
    }

    // Otherwise, no filter -> show all orders
    const pagination = await fetchSalesData(query, Number(page), Number(limit));
    const metrics = calculateMetrics(pagination.items);

    const urlQuery = new URLSearchParams(req.query).toString();

    res.render("admin/salesReport", {
      range: range || "all",
      startDate: start ? start.toISOString().slice(0, 16) : "",
      endDate: end ? end.toISOString().slice(0, 16) : "",
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      totalOrders: pagination.totalItems,
      orders: pagination.items,
      metrics,
      urlQuery
    });
  } catch (err) {
    console.error("renderSalesReport error", err);
    res
      .status(500)
      .render("error", { status: 500, message: "Internal Server Error" });
  }
};

const getSalesReportData = async (req, res) => {
    try {
        const {
            range = "day",
            startDate,
            endDate,
            page = 1,
            limit = 10
        } = req.query;

        const { query } = buildDateFilter(range, startDate, endDate);
        const pagination = await fetchSalesData(query, Number(page), Number(limit));
        const metrics = calculateMetrics(pagination.items);

        res.json({ success: true, ...pagination, metrics });
    } catch (err) {
        console.error("getSalesReportData error", err);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
};

 const downloadSalesReportPdf = async (req, res) => {
    try {
        const { range = "day", startDate, endDate } = req.query;
        console.log(range)
        const { query } = buildDateFilter(range, startDate, endDate);
        
        // Get ALL orders for the period (not paginated)
        const orders = await Order.find(query)
            .populate({ path: "userId", select: "name email" })
            .populate({ path: "items.productId", select: "name" })
            .sort({ createdAt: -1 })
            .lean();

        const metrics = calculateMetrics(orders);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=EliteCart_SalesReport_${range}_${new Date().toISOString().split('T')[0]}.pdf`);

        const doc = new PDFDocument({ size: "A4", margin: 40 });
        doc.pipe(res);

        // Company Header
        doc.fontSize(24).text("ELITECART", { align: "center" });
        doc.fontSize(16).text("Sales Report", { align: "center" });
        doc.moveDown();

        // Report Details
        doc.fontSize(12).text(`Report Period: ${range.toUpperCase()}`);
        if (startDate && endDate) {
            doc.text(`Date Range: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`);
        }
        doc.text(`Generated On: ${new Date().toLocaleString('en-IN')}`);
        doc.moveDown();

        // Summary
        doc.fontSize(14).text("SUMMARY", { underline: true });
        doc.fontSize(12).text(`Total Orders: ${metrics.count}`);
        doc.text(`Total Revenue: ₹${metrics.amount.toLocaleString()}`);
        doc.text(`Total Discount: ₹${metrics.discount.toLocaleString()}`);
        doc.moveDown();

        // Orders Table
        doc.fontSize(14).text("DETAILED ORDERS", { underline: true });
        doc.moveDown(0.5);

      orders.forEach((order) => {
    // Check if we need a new page
    if (doc.y > 650) {
        doc.addPage();
    }

    doc.fontSize(12).text(`Order #${order.orderId}`, { underline: true });
    doc.moveDown(0.3);

    const leftCol = 50;
    const rightCol = 300;
    let currentY = doc.y;

    const userName = order.userId?.name || "Unknown User";
    const userEmail = order.userId?.email || "N/A";

    // Left column - Basic info
    doc.fontSize(10).text(`Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`, leftCol, currentY);
    doc.text(`Customer: ${userName}`, leftCol, currentY + 15);
    doc.text(`Email: ${userEmail}`, leftCol, currentY + 30);
    doc.text(`Payment: ${order.paymentMethod || "N/A"}`, leftCol, currentY + 45);
    doc.text(`Status: ${order.orderStatus || "N/A"}`, leftCol, currentY + 60);

    // Right column - Financial info
    doc.text(`Subtotal: ₹${order.subtotal || 0}`, rightCol, currentY);
    doc.text(`Discount: ₹${order.discount || 0}`, rightCol, currentY + 15);
    doc.text(`Shipping: ₹${order.shippingCharge || 0}`, rightCol, currentY + 30);
    doc.fontSize(12).text(`Grand Total: ₹${order.grandTotal || 0}`, rightCol, currentY + 45);

    // Products section
    doc.moveDown(1);
    doc.fontSize(11).text("Products:", { underline: true });
    doc.moveDown(0.3);

    let productY = doc.y;
    order.items.forEach((item) => {
        if (productY > 700) {
            doc.addPage();
            productY = 50;
        }

        const productName = item.productId?.name || "Unknown Product";
        doc.fontSize(9).text(`• ${productName}`, 60, productY);
        doc.text(`  Quantity: ${item.quantity}`, 60, productY + 12);
        doc.text(`  Price: ₹${item.finalPrice || 0} each`, 60, productY + 24);
        doc.text(`  Total: ₹${item.total || 0}`, 60, productY + 36);

        productY += 50;
    });

    // Draw separator line
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
});


        doc.end();
    } catch (err) {
        console.error("downloadSalesReportPdf error", err);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};



function calculateMetrics(items) {
    const count = items.length;
    const amount = items.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    const discount = items.reduce((sum, o) => sum + (o.discount || 0), 0);
    return { count, amount, discount };
}

// Helpers
function buildDateFilter(range, startDate, endDate) {
    let start = null, end = null;
    const now = new Date();
    if (range === "custom" && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
    } else if (range === "day") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (range === "week") {
        const day = now.getDay();
        const diffToMonday = (day + 6) % 7; // Monday as start
        start = new Date(now);
        start.setDate(now.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
    } else if (range === "month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (range === "year") {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
    }

    const query = {};
    if (start && end) {
        query.createdAt = { $gte: start, $lt: end };
    }
    // Include only completed/valid orders for sales reporting
    query.orderStatus = { $in: [ "Delivered"] };

    return { query, start, end };
}

async function fetchSalesData(query, page, limit) {
    const skip = (page - 1) * limit;
    const [items, totalItems] = await Promise.all([
        Order.find(query)
            .populate({ path: "userId", select: "name email" })
            .populate({ path: "items.productId", select: "name" })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Order.countDocuments(query)
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return { items, totalItems, totalPages, currentPage: page, limit };
}






const downloadSalesReportExcel = async (req, res) => {
  try {
    const { range = "day", startDate, endDate } = req.query;
    const { query } = buildDateFilter(range, startDate, endDate);

    const orders = await Order.find(query)
      .populate({ path: "userId", select: "name email" })
      .populate({ path: "items.productId", select: "name" })
      .sort({ createdAt: -1 })
      .lean();

    const metrics = calculateMetrics(orders);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");

    // Header
    sheet.addRow(["EliteCart SALES REPORT"]);
    sheet.addRow([]);
    sheet.addRow([`Report Period: ${range.toUpperCase()}`]);
    if (startDate && endDate) {
      sheet.addRow([
        `Date Range: ${new Date(startDate).toLocaleDateString("en-IN")} to ${new Date(
          endDate
        ).toLocaleDateString("en-IN")}`,
      ]);
    }
    sheet.addRow([`Generated On: ${new Date().toLocaleString("en-IN")}`]);
    sheet.addRow([]);

    // Summary
    sheet.addRow(["SUMMARY"]);
    sheet.addRow(["Total Orders", "Total Revenue", "Total Discount"]);
    sheet.addRow([
      metrics.count,
      `₹${metrics.amount.toLocaleString()}`,
      `₹${metrics.discount.toLocaleString()}`,
    ]);
    sheet.addRow([]);

    // Detailed Orders
    sheet.addRow(["DETAILED ORDERS"]);
    sheet.addRow([
      "Order ID",
      "Date",
      "Customer",
      "Payment Method",
      "Status",
      "Subtotal",
      "Discount",
      "Shipping",
      "Grand Total",
    ]);

    orders.forEach((order) => {
      const userName = order.userId?.name || "Unknown User";
      const userEmail = order.userId?.email || "N/A";
      sheet.addRow([
        order.orderId,
        new Date(order.createdAt).toLocaleString("en-IN"),
        `${userName} (${userEmail})`,
        order.paymentMethod || "N/A",
        order.orderStatus || "N/A",
        `₹${order.subtotal || 0}`,
        `₹${order.discount || 0}`,
        `₹${order.shippingCharge || 0}`,
        `₹${order.grandTotal || 0}`,
      ]);
    });

    // Product details
    sheet.addRow([]);
    sheet.addRow(["PRODUCT DETAILS"]);
    sheet.addRow(["Order ID", "Product Name", "Quantity", "Unit Price", "Total Price"]);

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productName = item.productId?.name || "Unknown Product";
        sheet.addRow([
          order.orderId,
          productName,
          item.quantity || 0,
          `₹${item.finalPrice || 0}`,
          `₹${item.total || 0}`,
        ]);
      });
    });

    // Send Excel file
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=EliteCart_SalesReport_${range}_${new Date()
        .toISOString()
        .split("T")[0]}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("downloadSalesReportExcel error", err);
    res.status(500).send("Internal Server Error");
  }
};




function escapeCsv(value) {
    if (value == null) return "";
    const str = String(value).replace(/"/g, '""');
    if (str.includes(",") || str.includes("\n") || str.includes("\r")) {
        return `"${str}"`;
    }
    return str;
}




export default ({ 
  getSalesReport,
  downloadSalesReportPdf,
  getSalesReportData,
  downloadSalesReportExcel

})