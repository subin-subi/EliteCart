import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function() { return !this.googleId; }, // Required only if not Google user
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    mobileNo: {
      type: Number,
      required: function() { return !this.googleId; }, // Required only if not Google user
      unique: true,
      sparse: true // Allows multiple null values
    },
    password: {
      type: String,
      required: function() { return !this.googleId; } // Required only if not Google user
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    
    otp: {
      type: String,
      default: null
    },
    otpExpiresAt: {
      type: Date,
      default: null
    },
    otpAttempts: {
      type: Number,
      default: 0
    },
    isverified: {
      type: Boolean,
      default: false
    },
     redeemCode: {
      type: String,
      unique: true
    },
    
    googleId: {
      type: String,
      default: null
    },
    
   
    blocked: {
      type: Boolean,
      default: false
    },
    profileImage:{
      type :String
    }
  },
  { timestamps: true }
);

// ---------- Generate unique redeem code before saving ----------
userSchema.pre("save", async function (next) {
  if (!this.redeemCode) {
    let uniqueCodeFound = false;
    while (!uniqueCodeFound) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase(); 
      const existing = await mongoose.models.User.findOne({ redeemCode: code });
      if (!existing) {
        this.redeemCode = code;
        uniqueCodeFound = true;
      }
    }
  }
  next();
});



export default mongoose.model("User", userSchema);
