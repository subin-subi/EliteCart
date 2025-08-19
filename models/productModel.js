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
    color: {
      type: String,
      required: [true, "Color is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: 0,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    mainImage: {
      type: String, // store image URL or file path
      required: [true, "Main image is required"],
    },
    subImages: [
      {
        type: String, // multiple image URLs or paths
      },
    ],
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
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
