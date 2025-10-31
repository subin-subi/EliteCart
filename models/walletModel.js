import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Credit", "Debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } 
);

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, 
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    transactions: [transactionSchema],
  },
  { timestamps: true }
);

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;
