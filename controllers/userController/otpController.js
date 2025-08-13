import {generateOTP, sendOTPEmail} from "../../utils/sendOTP.js"
import userSchema from "../../models/userModel.js"; 




const validateOTP = async (req, res) => {
  try {
    const { userOtp, email } = req.body;
    console.log('User OTP:', userOtp);
    
    
    if (!userOtp || !email) {
      return res.status(400).json({ 
        success: false, 
        error: "OTP and email are required" 
      });
    }

    const user = await userSchema.findOne({ email: email.toLowerCase() });
    if (user) {
      
    }

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid OTP" 
      });
    }

    if (user.isverified) {
      return res.status(400).json({
        success: false,
        error: "User is already verified",
      });
    }

    if (user.otpAttempts >= 3) {
      return res.status(400).json({ 
        success: false,
        error: "Too many attempts. Please signup again."
      });
    }

    if (!user.otpExpiresAt || Date.now() > user.otpExpiresAt) {
      return res.status(400).json({ 
        success: false,
        error: "OTP Expired" 
      });
    }

    
    // Trim whitespace and ensure both are strings
    const storedOTP = String(user.otp).trim();
    const inputOTP = String(userOtp).trim();
    
    w
    

    if (storedOTP === inputOTP) {  
      
      
      await userSchema.findByIdAndUpdate(user._id, {
        $set: { isverified: true },
        $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1 }
      });

      req.session.user = user._id;

      return res.json({
        success: true,
        message: "OTP verified successfully",
        redirectUrl: "/home"
      });
    } else {
    
      
      await userSchema.findByIdAndUpdate(user._id, {
        $inc: { otpAttempts: 1 }
      });

      return res.status(400).json({ 
        success: false,
        error: "Invalid OTP" 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: "OTP verification failed" 
    });
  }
};

const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        const user = await userSchema.findOne({ email });
        
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        // Prevent multiple OTP requests
        if (user.otpExpiresAt && Date.now() < user.otpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: "Please wait before requesting a new OTP"
            });
        }

        // Generate new OTP
        const newOTP = generateOTP();
        
        // Update user with new OTP
        await userSchema.findByIdAndUpdate(user._id, {
            otp: newOTP,
            otpExpiresAt: Date.now() + 120000, // 2 minutes
            otpAttempts: 0
        });

        // Send new OTP
        await sendOTPEmail(email, newOTP);

        return res.json({
            success: true,
            message: "OTP resent successfully"
        });

    } catch (error) {
        console.error("Resend OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to resend OTP"
        });
    }
};


const sendForgotPasswordOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log('=== Send Forgot Password OTP ===');
        console.log('Email:', email);
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        // Find user
        const user = await userSchema.findOne({
            email: { $regex: new RegExp("^" + email + "$", "i") }
        });
        
        console.log('User found:', !!user);
        if (user) {
            console.log('User ID:', user._id);
            console.log('User Email:', user.email);
            console.log('Has Password:', !!user.password);
        }
        
        if (!user) {
            console.log("User not found in DB");
            return res.status(404).json({ message: 'User not found' });
        }
        
        if (!user.password) {
            console.log('User has no password (Google login)');
            return res.status(400).json({ 
                message: 'This email is linked to Google login. Please login with Google.' 
            });
        }
        
        // Generate and save OTP
        const otp = generateOTP();
        console.log('Generated OTP:', otp);
        console.log('OTP Type:', typeof otp);
        
        user.otp = otp;
        user.otpExpiresAt = Date.now() + 120000;
        user.otpAttempts = 0;
        await user.save();
        
        console.log('✅ User updated with OTP');
        console.log('Stored OTP:', user.otp);
        console.log('OTP Expires At:', user.otpExpiresAt);
        console.log('Current Time:', Date.now());
        console.log('Time Until Expiry:', user.otpExpiresAt - Date.now());

        // Send OTP email
        await sendOTPEmail(email, otp);
        console.log('✅ OTP email sent successfully');
        
        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('❌ Send forgot password OTP error:', error);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
};

const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        console.log('=== Forgot Password OTP Verification ===');
        console.log('Email:', email);
        console.log('OTP:', otp);
        
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await userSchema.findOne({ email: email.toLowerCase() });
        
        console.log('User found:', !!user);
        if (user) {
            console.log('User OTP:', user.otp);
            console.log('User OTP Type:', typeof user.otp);
            console.log('OTP Expires At:', user.otpExpiresAt);
            console.log('OTP Attempts:', user.otpAttempts);
            console.log('Current Time:', Date.now());
            console.log('OTP Expired:', user.otpExpiresAt ? Date.now() > user.otpExpiresAt : 'No expiry set');
        }

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        if (!user.otp || !user.otpExpiresAt) {
            return res.status(400).json({ message: 'No OTP found. Please request a new OTP.' });
        }

        if (Date.now() > user.otpExpiresAt) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
        }

        if (user.otpAttempts >= 3) {
            return res.status(400).json({ message: 'Too many attempts. Please request a new OTP.' });
        }

        // Increment attempts first
        user.otpAttempts += 1;
        await user.save();

        console.log('=== OTP Comparison ===');
        console.log('Stored OTP:', user.otp);
        console.log('Input OTP:', otp);
        console.log('Stored OTP Type:', typeof user.otp);
        console.log('Input OTP Type:', typeof otp);
        
        // Trim whitespace and ensure both are strings
        const storedOTP = String(user.otp).trim();
        const inputOTP = String(otp).trim();
        
        console.log('Trimmed Stored OTP:', storedOTP);
        console.log('Trimmed Input OTP:', inputOTP);
        console.log('OTP Match:', storedOTP === inputOTP);

        if (storedOTP === inputOTP) {
            console.log('✅ Forgot password OTP verified successfully');
            res.status(200).json({ message: 'OTP verified successfully' });
        } else {
            console.log('❌ Invalid OTP, attempts incremented');
            res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('❌ Verify forgot password OTP error:', error);
        res.status(500).json({ message: 'Failed to verify OTP' });
    }
};
const aboutPage = async (req, res) => {
    try {
      res.render("user/about");
    } catch (error) {
      console.error("Error rendering About page:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  
  
  

const testOTP = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await userSchema.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
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
    return res.status(500).json({
      success: false,
      message: 'Failed to test OTP'
    });
  }
};

export default {
    validateOTP,
    resendOTP,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    aboutPage,
    testOTP
}