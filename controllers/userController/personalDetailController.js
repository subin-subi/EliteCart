import { console } from "inspector";
import User from "../../models/userModel.js";
import upload from "../../utils/multer.js"
import {generateOTP, sendOTPEmail} from "../../utils/sendOTP.js"
import HTTP_STATUS from "../../utils/responseHandler.js";


const getProfile = async (req, res) => {
    try {
        const userId = req.session.user
        

          
        const user = await User.findById(userId);

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).send("User not found");
        }
        const isGoogleUser = !!user.googleId;
       
        res.render("user/profile", { user, isGoogleUser });
    } catch (err) {
        console.error("Error from getProfile:", err);
         res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};



const editDetail = [
  upload.single('profileImage'),
  async (req, res) => {
    try {
      const userId = req.session.user; 
      if (!userId) return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: 'Unauthorized' });

      const user = await User.findById(userId);
      if (!user) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'User not found' });

      const { name, email, phone } = req.body;
      const updateData = {};

      if (name?.trim()) updateData.name = name.trim();

      if (email?.trim()) {
        const existingEmailUser = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: userId } });
        if (existingEmailUser) {
          return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'This email is already in use by another user.' });
        }
        updateData.email = email.trim().toLowerCase();
      }

      if (phone?.trim()) {
        const existingUser = await User.findOne({ mobileNo: phone.trim(), _id: { $ne: userId } });
        if (existingUser) {
          return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'This phone number is already in use by another user.' });
        }
        updateData.mobileNo = phone.trim();
      }

      if (req.file?.path) updateData.profileImage = req.file.path;

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Profile updated', user: updatedUser });
    } catch (err) {
      console.error('Error in editDetail:', err);
       res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Something went wrong' });
    }
  }
];





const sendOtp = async (req, res) => {
  try {
    const { email } = req.body; 
    if (!email) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Email is required" });
    }

    const userId = req.session.user;
    if (!userId) return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });


     const existingUser = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: userId } });
    if (existingUser) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "This email is already in use by another account."
      });
    }


    const user = await User.findById(userId);
    if (!user) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "User not found" });

    const otp = generateOTP();
    const otpExpiresAt = Date.now() + 2 * 60 * 1000;

    
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.isverified = false;

    await user.save();

    
    await sendOTPEmail(email, otp); 

    console.log(` OTP sent to ${email}: ${otp}`);
    return res.status(HTTP_STATUS.OK).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error(" Error in sendOtp:", err);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error sending OTP", error: err.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.session.user;

    if (!userId) return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: "Unauthorized" });
    if (!otp) return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "OTP is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "User not found" });

     // Check if OTP is expired
    if (Date.now() > user.otpExpiresAt) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "OTP expired" });
    } 

    // Check if OTP matches
    if (user.otp !== otp) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid OTP" });
    }

   

    // OTP is valid
    user.isverified = true;
    user.otp = null;        
    user.otpExpiresAt = null; 
    await user.save();

    return res.status(HTTP_STATUS.OK).json({ success: true, message: "OTP verified successfully" });

  } catch (err) {
    console.error("Error in verifyOtp:", err);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error verifying OTP", error: err.message });
  }
};


const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Email is required"
      });
    }

    const userId = req.session.user;
    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent multiple OTP requests
    if (user.otpExpiresAt && Date.now() < user.otpExpiresAt) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Please wait before requesting a new OTP"
      });
    }

    const newOtp = generateOTP();

    user.otp = newOtp;
    user.otpExpiresAt = Date.now() + 2 * 60 * 1000; 
    user.otpAttempts = 0;
    await user.save();

    await sendOTPEmail(email, newOtp);

    return res.json({
      success: true,
      message: "OTP resent successfully"
    });

  } catch (err) {
    console.log("Resend OTP error:", err);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to resend OTP"
    });
  }
};






export default { 
                getProfile,
                editDetail,
              sendOtp,
               verifyOtp,
               resendOtp
              }