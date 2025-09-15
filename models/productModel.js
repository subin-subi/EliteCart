import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Brand is required"],
    },
   variants: [
  {
    volume: { type: Number, required: true },
    stock: { type: Number, required: true },
    price: { type: Number, required: true },
    discountPrice: { type: Number, default: null },
    isBlocked: { type: Boolean, default: false },
    mainImage: { type: String },
    subImages: [{ type: String }]
  }
]
, 
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
