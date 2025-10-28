import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Automatically update 'updatedAt' whenever wishlist changes
wishlistSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);
export default Wishlist;
