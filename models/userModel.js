import mongoose from "mongoose";

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
    
    // OTP verification fields
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
    }, 
     redeemCode: {
      type: String,
      unique: true
    },

  },
  { timestamps: true }
);



userSchema.pre("save", async function (next) {
  if (!this.redeemCode) {
    
    const code = crypto.randomBytes(3).toString("hex").toUpperCase(); 
   
    const existingUser = await mongoose.model("User").findOne({ redeemCode: code });
    if (!existingUser) {
      this.redeemCode = code;
    } else {
      this.redeemCode = crypto.randomBytes(3).toString("hex").toUpperCase(); 
    }
  }
  next();
});
export default mongoose.model("User", userSchema);
