import Order from "../../models/orderModel.js";
import PDFDocument from "pdfkit"
import HTTP_STATUS from "../../utils/responseHandler.js";
import ExcelJS from "exceljs";



const getSalesReport = async (req, res) => {
    try {
        const {
            range = "day",
            startDate,
            endDate,
            page = 1,
            limit = 10
        } = req.query;

        const { query, start, end } = buildDateFilter(range, startDate, endDate);
        query.orderStatus = "Delivered";

        const pagination = await fetchSalesData(query, Number(page), Number(limit));

        const metrics = calculateMetrics(pagination.items);

        const urlQuery = new URLSearchParams(req.query).toString();

        res.render("admin/salesReport", {
            range,
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
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("error", {
            status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            message: "Internal Server Error"
        });
    }
};




const downloadSalesReportPdf = async (req, res) => {
    try {
        const { range = "day", startDate, endDate } = req.query;
        const { query, start, end } = buildDateFilter(range, startDate, endDate);
        
        // Get ALL orders for the period (not paginated)
        const orders = await Order.find(query)
            .populate({ path: "userId", select: "name email" })
            .populate({ path: "items.productId", select: "name" })
            .sort({ createdAt: -1 })
            .lean();

        const metrics = calculateMetrics(orders);
        const periodDescription = describeRange(range, start, end);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=EliteCart_SalesReport_${range}_${new Date().toISOString().split('T')[0]}.pdf`);

        const doc = new PDFDocument({ size: "A4", margin: 40 });
        doc.pipe(res);

        // Company Header
        doc.fontSize(24).text("ELITECART", { align: "center" });
        doc.fontSize(16).text("Sales Report", { align: "center" });
        doc.moveDown();

        // Report Details
        doc.fontSize(12).text(`Report Range: ${range.toUpperCase()}`);
        doc.text(`Period: ${periodDescription}`);
        doc.text(`Generated On: ${new Date().toLocaleString('en-IN')}`);
        doc.moveDown();

        // Summary
        doc.fontSize(14).text("SUMMARY", { underline: true });
        doc.fontSize(12).text(`Total Orders: ${metrics.count}`);
        doc.text(`Total Revenue: Rs: ${metrics.amount.toLocaleString()}`);
        doc.text(`Total Discount: Rs: ${metrics.discount.toLocaleString()}`);
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
    doc.text(`Subtotal: Rs: ${order.subtotal || 0}`, rightCol, currentY);
    doc.text(`Discount: Rs: ${order.discount || 0}`, rightCol, currentY + 15);
    doc.text(`Shipping: Rs: ${order.shippingCharge || 0}`, rightCol, currentY + 30);
    doc.fontSize(12).text(`Grand Total: Rs: ${order.grandTotal || 0}`, rightCol, currentY + 45);

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
        doc.text(`  Price: Rs: ${item.finalPrice || 0} each`, 60, productY + 24);
        doc.text(`  Total: Rs: ${item.total || 0}`, 60, productY + 36);

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
function buildDateFilter(range = "day", startDate, endDate) {
  const now = new Date();
  let start = null;
  let end = null;

  const normalizeDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return new Date(value);
    if (typeof value === "string") {
      const sanitized = value.includes("T") ? value : value.replace(" ", "T");
      const parsed = new Date(sanitized);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  switch (range) {
    case "custom": {
      const normalizedStart = normalizeDate(startDate);
      const normalizedEnd = normalizeDate(endDate);
      if (normalizedStart) start = startOfDay(normalizedStart);
      if (normalizedEnd) end = endOfDay(normalizedEnd);
      break;
    }
    case "week": {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      start = startOfDay(start);
      end = now;
      break;
    }
    case "month": {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      start = startOfDay(start);
      end = now;
      break;
    }
    case "year": {
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      start = startOfDay(start);
      end = now;
      break;
    }
    case "day":
    default: {
      if (range === "all") {
        start = null;
        end = null;
      } else {
        start = startOfDay(now);
        end = now;
      }
      break;
    }
  }

  if (start && !end) {
    end = now;
  }

  if (start && end && start > end) {
    const temp = start;
    start = end;
    end = temp;
  }

  // Include all non-cancelled, non-failed orders for sales reporting
  const query = {
    orderStatus: { $nin: ["Cancelled"] },
    paymentStatus: { $ne: "Failed" },
  };

  if (start && end) {
    query.createdAt = { $gte: start, $lte: end };
  }

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

function describeRange(range, start, end) {
  const formatDateTime = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleString("en-IN");
  };

  const formattedStart = formatDateTime(start);
  const formattedEnd = formatDateTime(end);

  if (formattedStart && formattedEnd) {
    return `${formattedStart} to ${formattedEnd}`;
  }

  switch (range) {
    case "day":
      return "Today";
    case "week":
      return "Last 7 Days";
    case "month":
      return "Last 30 Days";
    case "year":
      return "Last 12 Months";
    case "custom":
      return "Custom Period";
    default:
      return "All Time";
  }
}






const downloadSalesReportExcel = async (req, res) => {
  try {
    const { range = "day", startDate, endDate } = req.query;
    const { query, start, end } = buildDateFilter(range, startDate, endDate);
    const periodDescription = describeRange(range, start, end);

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
    sheet.addRow([`Report Range: ${range.toUpperCase()}`]);
    sheet.addRow([`Period: ${periodDescription}`]);
    sheet.addRow([`Generated On: ${new Date().toLocaleString("en-IN")}`]);
    sheet.addRow([]);

    // Summary
    sheet.addRow(["SUMMARY"]);
    sheet.addRow(["Total Orders", "Total Revenue", "Total Discount"]);
    sheet.addRow([
      metrics.count,
      `Rs: ${metrics.amount.toLocaleString()}`,
      `Rs: ${metrics.discount.toLocaleString()}`,
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
        `Rs: ${order.subtotal || 0}`,
        `Rs: ${order.discount || 0}`,
        `Rs: ${order.shippingCharge || 0}`,
        `Rs: ${order.grandTotal || 0}`,
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
          `Rs: ${item.finalPrice || 0}`,
          `Rs: ${item.total || 0}`,
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
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};








export default ({ 
  getSalesReport,
  downloadSalesReportPdf,
  downloadSalesReportExcel

})