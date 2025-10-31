import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import Order from "../../models/orderModel.js";

const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("userId")
      .populate("items.productId");

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
      .fillColor("black")
      .fontSize(14)
      .text("Official Invoice", { align: "center" })
      .moveDown(1.5);

    // ---------- ORDER INFO ----------
    doc.fontSize(12);
    doc.text(`Order ID     : ${order.orderId}`);
    doc.text(`Date         : ${new Date(order.createdAt).toLocaleString()}`);
    doc.text(`Payment Type : ${order.paymentMethod}`);
    doc.text(`Payment Status : ${order.paymentStatus}`);
    doc.text(`Order Status : ${order.orderStatus}`);
    doc.moveDown(1);

    // ---------- BILLING & SHIPPING ----------
    doc.fontSize(13).fillColor("#16a34a").text("Billing & Shipping Address", { underline: true });
    doc.fillColor("black").moveDown(0.5);
    const { address } = order;
    doc.fontSize(12)
      .text(`Name       : ${address.name}`)
      .text(`House      : ${address.house}`)
      .text(`Street     : ${address.street}`)
      .text(`City       : ${address.city}`)
      .text(`State      : ${address.state}`)
      .text(`Country    : ${address.country}`)
      .text(`Pincode    : ${address.pincode}`)
      .text(`Mobile No. : ${address.mobile}`)
      .moveDown(1.2);

    // ---------- PRODUCT TABLE ----------
  // ---------- ORDER ITEMS TABLE ----------
doc.fontSize(14).fillColor("#16a34a").text("Order Items", { underline: true });
doc.moveDown(0.5);

// Table column positions (adjusted for better spacing)
const tableTop = doc.y + 10;
const startX = 50;
const col1 = startX;        // S.No
const col2 = col1 + 40;     // Product Name
const col3 = col2 + 150;    // Unit Price (moved closer)
const col4 = col3 + 70;     // Quantity
const col5 = col4 + 70;     // Discount
const col6 = col5 + 70;     // Total

// Header Line
doc.moveTo(startX, tableTop - 5)
   .lineTo(550, tableTop - 5)
   .strokeColor("#000")
   .lineWidth(1)
   .stroke();

doc.fontSize(12).fillColor("black").font("Helvetica-Bold");
doc.text("S.No", col1, tableTop);
doc.text("Product Name", col2, tableTop);
doc.text("Unit Price", col3, tableTop);
doc.text("Quantity", col4, tableTop);
doc.text("Discount", col5, tableTop);
doc.text("Total", col6, tableTop);

// Divider Line
doc.moveTo(startX, tableTop + 15)
   .lineTo(550, tableTop + 15)
   .stroke();

let y = tableTop + 25;
doc.font("Helvetica");
order.items.forEach((item, i) => {
  const name = item.productId?.name || "Unnamed Product";
  const price = `₹${item.finalPrice.toFixed(2)}`;
  const qty = item.quantity;
  const discount = item.discountAmount ? `₹${item.discountAmount.toFixed(2)}` : "-";
  const total = `₹${(item.finalPrice * qty).toFixed(2)}`;

  doc.fontSize(11);
  doc.text(i + 1, col1, y);
  doc.text(name, col2, y, { width: 130 });
  doc.text(price, col3, y);
  doc.text(qty.toString(), col4, y);
  doc.text(discount, col5, y);
  doc.text(total, col6, y);

  y += 20;

  // Line after each row
  doc.moveTo(startX, y - 5).lineTo(550, y - 5).strokeColor("#ccc").lineWidth(0.5).stroke();
});

doc.moveDown(2);

// ---------- TOTALS (Clean & Perfectly Aligned) ----------
const labelX = 400;  // position for "Subtotal:", "Discount:", etc.
const valueX = 500;  // position for the ₹ values
let yPos = doc.y + 15;

// Normal text color and font
doc.fontSize(12).fillColor("black").font("Helvetica");

// Subtotal
doc.text("Subtotal:", labelX, yPos);
doc.text(`₹${order.subtotal.toFixed(2)}`, valueX, yPos, { align: "left" });
yPos += 18;

// Discount
doc.text("Discount:", labelX, yPos);
doc.text(`₹${order.discount.toFixed(2)}`, valueX, yPos, { align: "left" });
yPos += 18;

// Shipping
doc.text("Shipping:", labelX, yPos);
doc.text(`₹${order.shippingCharge.toFixed(2)}`, valueX, yPos, { align: "left" });
yPos += 25;

// Grand Total
doc
  .fontSize(14)
  .fillColor("#16a34a")
  .font("Helvetica-Bold")
  .text("Grand Total:", labelX, yPos);
doc.text(`₹${order.grandTotal.toFixed(2)}`, valueX, yPos, { align: "left" });

// Reset for next section
doc.fillColor("black").font("Helvetica").moveDown(2);

   // ---------- FOOTER ----------  
doc.moveDown(1.2); // adds a small gap before footer

doc
  .fontSize(11)
  .fillColor("#000000")
  .text("Thank you for shopping with EliteCart!", {
    align: "center",
  })
  .moveDown(0.3)
  .fontSize(9)
  .fillColor("gray")
  .moveDown(0.2)
  .fontSize(9)
  .fillColor("gray")
  .text("For support, contact support@elitecart.com", {
    align: "center",
  });

doc.end();

  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
};


export default ({generateInvoice});
