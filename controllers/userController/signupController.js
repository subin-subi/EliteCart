import userSchema from "../../models/userModel.js"; 
import validatePassword from "../../utils/validatePassword.js";
import bcrypt from "bcrypt"
import {generateOTP, sendOTPEmail} from "../../utils/sendOTP.js"
import passport  from "../../utils/googleAuth.js";

const saltRounds =10;



const getSignUp = (req, res) => {
    try {
        res.render('user/signup')
    } catch (error) {
        console.error('Error rendering signup page:', error);
        res.status(500).render('error', { 
            message: 'Error loading signup page',
            error: error.message 
        });
    }
}

const postSignup = async (req, res) => {
  try {
    const { name, email, mobileNo, password } = req.body;

    // Validate name: only letters and spaces, 2-50 chars
    if (!name || !/^[a-zA-Z\s]{2,50}$/.test(name.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Name should be 2-50 characters long and contain only letters and spaces',
      });
    }

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // Validate mobileNo: exactly 10 digits (adjust if needed)
    if (!mobileNo || !/^\d{10}$/.test(mobileNo)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit mobile number',
      });
    }

    // Validate password (use your existing validatePassword function)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
      });
    }

    // Check if user with this email or mobileNo exists
    const existingUser = await userSchema.findOne({
      $or: [{ email }, { mobileNo }],
    });

    if (existingUser) {
      if (!existingUser.isverified) {
        await userSchema.deleteOne({ _id: existingUser._id });
      } else {
        const message = !existingUser.password
          ? 'This email is linked to a Google login. Please log in with Google.'
          : 'Email or mobile number is already registered';
        return res.status(400).json({
          success: false,
          message,
        });
      }
    }

    // Generate OTP and hash password
    const otp = generateOTP();
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log(' OTP:', otp);
   
    // Save new user
    const newUser = new userSchema({
      name: name.trim(),
      email,
      mobileNo,
      password: hashedPassword,
      otp,
      otpExpiresAt: Date.now() + 120000, // 2 minutes
      otpAttempts: 0,
    });

    await newUser.save();
    

    // Schedule deletion after OTP expiry if not verified
    setTimeout(async () => {
      const user = await userSchema.findOne({ email });
      if (user && !user.isverified) {
        await userSchema.deleteOne({ _id: user._id });
      }
    }, 180000);

    // Send OTP Email
    try {
      await sendOTPEmail(email, otp);
    } catch (emailError) {
      console.error('Error sending OTP:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      email,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Signup failed',
    });
  }
};
    
    const getLogin = (req, res) => {
        try {
            res.render('user/login')
        } catch (error) {
            console.error('Error rendering login page:', error);
            res.status(500).render('error', { 
                message: 'Error loading login page',
                error: error.message 
            });
        }
    }


    const postLogin = async (req, res) => {
        try {
           

            const { email, password } = req.body;
            
            // Server-side validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'All fields are required'
                });
            }
    
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }
    
            // Find user
            const user = await userSchema.findOne({ email });
            // Check if user exists
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: "Your email is not registered. Please signup first."
                });
            }
    
            if(!user.password) {
                return res.status(400).json({
                    success: false,
                    message: 'This email is linked to a Google login. Please log in with Google.'
                });
            }
    
           // Check if user is verified
           if (user.isverified === false) {  
            return res.status(400).json({
                success: false,
                message: 'Please verify your email first'
            });
        }
        
    
            // Check if user is blocked
            if (user.blocked) {
                return res.status(400).json({
                    success: false,
                    message: 'Your account has been blocked'
                });
            }
    
            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
    
            // Set session
            req.session.user = user._id;
            req.session.userEmail = user.email;
    
            // Return success response with redirect URL
            return res.json({
                success: true,
                message: 'Login successful',
                redirectUrl: '/'
            });
    
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                success: false,
                message: 'Login failed'
            });
        }
    };
    
    const homepage = (req, res) => {
        try {
            res.render("user/home");
        } catch (error) {
            console.error("Error in home page", error);
            res.status(500).send("Internal Server Error");
        }
    };
    

    const getForgotPassword = (req, res)=>{
        try{
            res.render('user/forgotPassword')
        }catch(error){
            console.error("Error rendering forgot password page:", error)
            res.status(500),render("error",{
                message :' error loading forgot password page',
                error: error.message
            })
        }
    }
    


    
    const resetPassword = async (req, res) => {
        try {
            const { email, newPassword } = req.body;
            
            const user = await userSchema.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
    
            // Validate new password
            const passwordValidation = validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                return res.status(400).json({ message: passwordValidation.message });
            }
    
            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            
            // Update password and remove OTP fields
            await userSchema.findByIdAndUpdate(user._id, {
                $set: { password: hashedPassword },
                $unset: { otp: 1, otpExpiresAt: 1, otpAttempts: 1 }
            });
    
            res.status(200).json({ message: 'Password reset successfully' });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ message: 'Failed to reset password' });
        }
    };

    
    
    const getGoogle = (req, res) => {
        // Store the trigger in session before redirecting to Google
        req.session.authTrigger = req.query.trigger;
       
        
        passport.authenticate("google", {
            scope: ["email", "profile"],
        })(req, res);
    };
    
    const getGoogleCallback = (req, res) => {
        passport.authenticate("google", { failureRedirect: "/login" }, async (err, profile) => {
            try {
                if (err || !profile) {
                    return res.redirect("/login?message=Authentication failed&alertType=error");
                }
    
                const existingUser = await userSchema.findOne({ email: profile.email });
    
                // If user exists, check if blocked before logging in
                if (existingUser) {
                    // Check if user is blocked
                    if (existingUser.blocked) {
                        return res.redirect("/login?message=Your account has been blocked&alertType=error");
                    }
    
                    // Update googleId if it doesn't exist and unset otpAttempts
                    await userSchema.findByIdAndUpdate(existingUser._id, {
                        $set: { googleId: existingUser.googleId || profile.id },
                        $unset: { otpAttempts: 1 }
                    });
                    
                    req.session.user = existingUser._id;
                    return res.redirect("/");
                }
    
                // If user doesn't exist, create new account
                const newUser = new userSchema({
                    name: profile.displayName,
                    email: profile.email,
                    googleId: profile.id,
                    isverified: true,
                });
                await newUser.save();
                await userSchema.findByIdAndUpdate(newUser._id, {
                    $unset: { otpAttempts: 1 }
                });
                
                req.session.user = newUser._id;
                return res.redirect("/");
    
            } catch (error) {
                console.error("Google authentication error:", error);
                return res.redirect("/login?message=Authentication failed&alertType=error");
            }
        })(req, res);
    };
    
    const getLogout = (req, res) => {
  try {
    
    req.session.user = null;

    
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).send("Error logging out");
      }

      
      res.clearCookie("connect.sid"); 

      
      res.redirect("/signup");
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).send("Something went wrong during logout");
  }
};


 
const checkSession = (req, res) => {
    if (!req.session || !req.session.user) {
        return res.json({ isLoggedIn: false });
    }

    res.json({ isLoggedIn: true });
};


const getProfileImg = async(req, res)=>{
  try{
    const userId = req.session.user;
     if (!userId) return res.status(401).json({ loggedIn: false });

     const user = await userSchema.findById(userId).select("profileImage name")
 res.json({
      loggedIn: true,
      profileImage: user.profileImage || null,
      name: user.name,
    });

  }catch (error) {
    console.error(error);
    res.status(500).json({ loggedIn: false });
  }
}



export default{
    getSignUp,
    postSignup,
    
    getLogin,
    postLogin,

    getForgotPassword,
    resetPassword,


    getGoogle,
    getGoogleCallback,
    getLogout,
    homepage,
    checkSession,

    getProfileImg 

    

}