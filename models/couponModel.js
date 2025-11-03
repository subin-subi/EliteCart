import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, "Coupon code is required"],
    unique: true,
    trim: true,
    uppercase: true,
  },
  description: {
    type: String,
    trim: true,
  },
  discountType: {
    type: String,
    enum: ["percentage", "flat"],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: [1, "Discount value must be greater than 0"],
  },
  maxDiscountAmount: {
    type: Number,
    default: null,
  },
  minPurchaseAmount: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  
  perUserLimit: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  usedBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      usedAt: { type: Date, default: Date.now }, 
    },
  ],
}, { timestamps: true });

export default mongoose.model("Coupon", couponSchema);
