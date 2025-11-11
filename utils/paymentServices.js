import razorpayInstance from "./rasorPay.js";
import crypto from "crypto";

export async function createRazorpayOrder (amount , receipt){
    try{
        const option = {
            amount : Math.round(amount*100),
            currency: "INR",
            receipt,
            payment_capture:1
        }
        const order = await razorpayInstance.orders.create(option);
        return order;
    }catch(err){
        console.error("Razorpay order creation error:", err);
        throw err;
    }
} 

export function verifyRazorpaySignature(orderId, paymentId, signature) {
  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(orderId + "|" + paymentId);
  const generatedSignature = hmac.digest("hex");
  return generatedSignature === signature;
}