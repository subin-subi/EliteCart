import {generateOTP, sendOTPEmail} from "../../utils/sendOTP.js"
import userSchema from "../../models/userModel.js"; 
import HTTP_STATUS from "../../utils/responseHandler.js";

const validateOTP = async (req, res) => {
  try {
    const { userOtp, email } = req.body;
   
    
    if (!userOtp || !email) {
      console.log('Missing required fields');
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: "OTP and email are required" 
      });
    }

    const user = await userSchema.findOne({ email: email.toLowerCase() });
    console.log('User found:', !!user);
    
    if (!user) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false, 
        error: "User not found" 
      });
    }



    if (user.isverified) {
      console.log('User already verified');
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: "User is already verified",
      });
    }

    if (user.otpAttempts >= 3) {
      console.log('Too many OTP attempts');
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: "Too many attempts. Please signup again."
      });
    }

    if (!user.otpExpiresAt || Date.now() > user.otpExpiresAt) {

      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: "OTP Expired" 
      });
    }

    if (!user.otp) {
      console.log('No OTP found in user record');
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: "No OTP found. Please request a new OTP." 
      });
    }
    
  
    const storedOTP = String(user.otp).trim();
    const inputOTP = String(userOtp).trim();
    

    if (storedOTP === inputOTP) {  
      
      
      await userSchema.findByIdAndUpdate(user._id, {
        $set: { isverified: true },
        $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1 }
      });

      req.session.user = user._id;

      return res.json({
        success: true,
        message: "OTP verified successfully",
        redirectUrl: "/"
      });
    } else {
    
      
      await userSchema.findByIdAndUpdate(user._id, {
        $inc: { otpAttempts: 1 }
      });

      return  res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        success: false,
        error: "Invalid OTP" 
      });
    }
  } catch (error) {
    return  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      error: "OTP verification failed" 
    });
  }
};

const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log("email", email  )
        if (!email) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Email is required"
            });
        }
        
        const user = await userSchema.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "User not found"
            });
        }

        
        if (user.otpExpiresAt && Date.now() < user.otpExpiresAt) {
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: "Please wait before requesting a new OTP"
            });
        }

       
        const newOTP = generateOTP();
        
        
        await userSchema.findByIdAndUpdate(user._id, {
            otp: newOTP,
            otpExpiresAt: Date.now() + 120000, 
            otpAttempts: 0
        });

        
        await sendOTPEmail(email, newOTP);

        return res.json({
            success: true,
            message: "OTP resent successfully"
        });

    } catch (error) {
        console.error("Resend OTP error:", error);
        return  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to resend OTP"
        });
    }
};


const sendForgotPasswordOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
       
        
        if (!email) {
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Email is required' });
        }
        
      
        const user = await userSchema.findOne({
            email: { $regex: new RegExp("^" + email + "$", "i") }
        });
        
       
        if (user) {
           
        }
        
        if (!user) {
            console.log("User not found in DB");
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'User not found' });
        }
        
        if (!user.password) {
            console.log('User has no password (Google login)');
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: 'This email is linked to Google login. Please login with Google.' 
            });
        }
        
        
        const otp = generateOTP();
        console.log('Generated OTP:', otp);
       
        
        user.otp = otp;
        user.otpExpiresAt = Date.now() + 120000;
        user.otpAttempts = 0;
        await user.save();
        
        
       
        await sendOTPEmail(email, otp);
      
        
        res.status(HTTP_STATUS.OK).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error(' Send forgot password OTP error:', error);
         res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to send OTP' });
    }
};

const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
      
        if (!email || !otp) {
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Email and OTP are required' });
        }

        const user = await userSchema.findOne({ email: email.toLowerCase() });
        
        console.log('User found:', !!user);
        if (user) {
           
        }

        if (!user) {
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid or expired OTP' });
        }

        if (!user.otp || !user.otpExpiresAt) {
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'No OTP found. Please request a new OTP.' });
        }

        if (Date.now() > user.otpExpiresAt) {
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'OTP has expired. Please request a new OTP.' });
        }

        if (user.otpAttempts >= 3) {
            return  res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Too many attempts. Please request a new OTP.' });
        }


        user.otpAttempts += 1;
        await user.save();

        
        
       
        const storedOTP = String(user.otp).trim();
        const inputOTP = String(otp).trim();
        
        
        if (storedOTP === inputOTP) {
          
            res.status(HTTP_STATUS.OK).json({ message: 'OTP verified successfully' });
        } else {
           
            res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        
         res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: 'Failed to verify OTP' });
    }
};



  
  
  

const testOTP = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return  res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await userSchema.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "User not found"
      });
    }

    return res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        otp: user.otp,
        otpExpiresAt: user.otpExpiresAt,
        otpAttempts: user.otpAttempts,
        isverified: user.isverified,
        currentTime: Date.now(),
        isExpired: user.otpExpiresAt ? Date.now() > user.otpExpiresAt : true
      }
    });

  } catch (error) {
    console.error('Test OTP error:', error);
    return  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Failed to test OTP'
    });
  }
};

const debugOTP = async (req, res) => {
  try {
    const { email } = req.params;

    const user = await userSchema.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        otp: user.otp,
        otpType: typeof user.otp,
        otpExpiresAt: user.otpExpiresAt,
        otpAttempts: user.otpAttempts,
        isverified: user.isverified,
        currentTime: Date.now(),
        isExpired: user.otpExpiresAt
          ? Date.now() > user.otpExpiresAt
          : true,
        timeUntilExpiry: user.otpExpiresAt
          ? user.otpExpiresAt - Date.now()
          : null,
      },
    });
  } catch (error) {
    console.error("Debug OTP error:", error);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Debug failed" });
  }
}

export default {
    validateOTP,
    resendOTP,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    testOTP,
    debugOTP
}