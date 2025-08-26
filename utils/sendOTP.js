import nodemailer from "nodemailer"
import { config } from "dotenv"
config()

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Generate a 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
export const sendOTPEmail = async (email, otp) => {
    try {
    
      
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Email configuration not set. Please check EMAIL_USER and EMAIL_PASS environment variables.');
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for Account Verification',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Account Verification</h2>
                    <p style="color: #666; font-size: 16px;">Your One-Time Password (OTP) for account verification is:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #333; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p style="color: #666; font-size: 14px;">This OTP will expire in 2 minutes.</p>
                    <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
                </div>
            `
        };
        
        console.log('Generated OTP for email:', otp);
        const result = await transporter.sendMail(mailOptions);
      
        return true;
     } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};