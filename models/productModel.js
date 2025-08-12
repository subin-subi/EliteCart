import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" }, // ✅ Added
  offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer" },
  productVariants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Variant" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  discount: Number,
  quantity: Number,
  status: { type: String, enum: ["Active", "Pending", "Blocked"], default: "Active" }
});

export default mongoose.model("Product", productSchema);
