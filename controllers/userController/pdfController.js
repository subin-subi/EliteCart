import PDFDocument from "pdfkit";
import Order from "../../models/orderModel.js";

const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("userId", "name email mobile")
      .populate("items.productId", "name");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${order.orderId}.pdf`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // ---------- HEADER ----------
    doc
      .fontSize(22)
      .fillColor("#16a34a")
      .text("EliteCart", { align: "center" })
      .moveDown(0.2)
      .fontSize(14)
      .fillColor("black")
      .text("Official Invoice", { align: "center" })
      .moveDown(1);

    // ---------- ORDER INFO ----------
    doc.fontSize(12).fillColor("black");
    doc.text(`Order ID       : ${order.orderId}`);
    doc.text(`Order Date     : ${new Date(order.createdAt).toLocaleString()}`);
    doc.text(`Payment Type   : ${order.paymentMethod}`);
    doc.text(`Payment Status : ${order.paymentStatus}`);
    doc.text(`Order Status   : ${order.orderStatus}`);
    doc.moveDown(1);

    // ---------- BILLING & SHIPPING ----------
    doc
      .fontSize(13)
      .fillColor("#16a34a")
      .text("Billing & Shipping Address", { underline: true })
      .moveDown(0.3);
    const { address } = order;
    doc.fontSize(12).fillColor("black");
    doc.text(`Name    : ${address.name}`);
    doc.text(`House   : ${address.house}`);
    doc.text(`Street  : ${address.street}`);
    doc.text(`City    : ${address.city}`);
    doc.text(`State   : ${address.state}`);
    doc.text(`Country : ${address.country}`);
    doc.text(`Pincode : ${address.pincode}`);
    doc.text(`Mobile  : ${address.mobile}`);
    doc.moveDown(1);

    // ---------- ORDER ITEMS TABLE ----------
    doc.fontSize(14).fillColor("#16a34a").text("Order Items", { underline: true });
    doc.moveDown(0.3);

    const startX = 50;
    const colSpacing = [40, 120, 70, 50, 70, 70, 90];
    const headers = ["S.No", "Product Name", "Unit Price", "Qty", "Discount", "Total", "Status"];

    let y = doc.y + 10;

    // Table header
    doc.fontSize(12).font("Helvetica-Bold").fillColor("black");
    let x = startX;
    headers.forEach((header, i) => {
      doc.text(header, x, y, { width: colSpacing[i], align: "left" });
      x += colSpacing[i];
    });
    y += 20;

    doc.moveTo(startX, y - 5)
      .lineTo(startX + colSpacing.reduce((a, b) => a + b, 0), y - 5)
      .strokeColor("#000")
      .lineWidth(1)
      .stroke();

    // Table rows
    doc.font("Helvetica").fontSize(11).fillColor("black");

    order.items.forEach((item, i) => {
      const name = item.productId?.name || "Unnamed Product";
      const price = `Rs: ${item.finalPrice.toFixed(2)}`;
      const qty = item.quantity;
      const discount = item.discountAmount ? `Rs: ${item.discountAmount.toFixed(2)}` : "-";
      const total = `Rs: ${(item.finalPrice * qty).toFixed(2)}`;

      // Determine status (cancel/return)
      let statusText = "";
      if (item.cancelStatus === "Cancelled") {
        statusText = " Cancelled";
      } else if (item.returnStatus && item.returnStatus !== "Not Requested") {
        statusText = `↩ ${item.returnStatus}`;
      }

      const rowValues = [i + 1, name, price, qty, discount, total, statusText];

      let xPos = startX;
      rowValues.forEach((val, j) => {
        doc.text(val.toString(), xPos, y, { width: colSpacing[j], align: "left" });
        xPos += colSpacing[j];
      });

      y += 20;

      doc.moveTo(startX, y - 5)
        .lineTo(startX + colSpacing.reduce((a, b) => a + b, 0), y - 5)
        .strokeColor("#ccc")
        .lineWidth(0.5)
        .stroke();
    });

    doc.moveDown(2);

    // ---------- TOTALS (Centered) ----------
const pageWidth = doc.page.width;
const labelX = pageWidth / 2 - 30;   // move totals section closer to center
const valueX = pageWidth / 2 + 110;
let yPos = doc.y + 15;

doc.fontSize(12).font("Helvetica").fillColor("black");

doc.text("Subtotal:", labelX, yPos);
doc.text(`Rs: ${order.subtotal.toFixed(2)}`, valueX, yPos);
yPos += 18;

doc.text("Discount:", labelX, yPos);
doc.text(`Rs: ${order.discount.toFixed(2)}`, valueX, yPos);
yPos += 18;

doc.text("Shipping:", labelX, yPos);
doc.text(`Rs: ${order.shippingCharge.toFixed(2)}`, valueX, yPos);
yPos += 25;

doc.fontSize(14).font("Helvetica-Bold").fillColor("#16a34a");
doc.text("Grand Total:", labelX, yPos);
doc.text(`Rs: ${order.grandTotal.toFixed(2)}`, valueX, yPos);

doc.moveDown(2);

    // ---------- FOOTER ----------
    doc.fontSize(11).fillColor("black").text("Thank you for shopping with EliteCart!", { align: "center" });
    doc.fontSize(9).fillColor("gray").text("For support, contact support@elitecart.com", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
};

export default { generateInvoice };
