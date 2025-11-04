import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  offerType: {
    type: String,
    enum: ["PRODUCT", "CATEGORY"],
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: null,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null,
  },
  discountPercent: {
    type: Number,
    min: 1,
    max: 90,
    required: true,
  },
  startAt: {
    type: Date,
    required: true,
  },
  endAt: {
    type: Date,
    required: true,
  },
  isActive: { 
    type: Boolean,
    default: false,
  },
  isNonBlocked:{
    type:Boolean,
    default:true
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});



const Offer = mongoose.model("Offer", offerSchema);
export default Offer;