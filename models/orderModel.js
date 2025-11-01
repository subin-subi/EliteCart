import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: { type: String, unique: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
      quantity: { type: Number, required: true },
      
      // Price details (Snapshot at order time)
      basePrice: { type: Number, required: true },
      discountAmount: { type: Number, default: 0 }, 
      finalPrice: { type: Number, required: true }, 

      appliedOffer: { type: String, default: null }, 


      cancelStatus: {
        type: String,
        enum: ["Not Cancelled", "Cancelled"],
        default: "Not Cancelled"
      },
      cancelReason: { type: String },


      returnStatus: {
        type: String,
        enum: ["Not Requested", "Requested", "Approved", "Rejected"],
        default: "Not Requested"
      },
      returnReason: { type: String },
      refundAmount: { type: Number, default: 0 }, 
      returnRequestDate: { type: Date }
    }
  ],


  address: {
    name: String,
    house: String,
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    mobile: String
  },

  paymentMethod: { type: String, enum: ["COD", "RAZORPAY","WALLET"], required: true },
  paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },


  orderStatus: {
    type: String,
    enum: ["Pending", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
    default: "Pending"
  },

  razorpayPaymentId:{type:String,default:null},
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 }, 
  shippingCharge: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },


  appliedCoupon: { type: String, default: null },

},{
    timestamps:true
});

  orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    
    const shortId = this._id.toString().slice(-6).toUpperCase();

    this.orderId = `ORD-${year}${month}${day}${shortId}`;

  }
  next();
});
  const Order = mongoose.model("Order", orderSchema);

export default Order;