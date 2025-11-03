
import Coupon from "../../models/couponModel.js"


const getCouponPage = async(req, res)=>{
   try{
const coupons = await Coupon.find().lean()
       res.render("admin/coupon",{coupons})
   }  catch (err) {
    console.log("Error loading coupon page:", err);
    res.status(500).send("Server Error");
  }
}



const addCoupon = async (req, res) => {
  try {
    const { code, discountType, discount, startDate, expiryDate, maxAmount, minAmount, description } = req.body;
console.log(code, discountType, discount, startDate, expiryDate, maxAmount, minAmount, description)
    if (!code || !discountType || !discount || !startDate || !expiryDate) {
      return res.status(400).json({ success: false, message: "Please fill all required fields." });
    }

    if (new Date(expiryDate) <= new Date(startDate)) {
      return res.status(400).json({ success: false, message: "Expiry date must be after start date." });
    }


    const newCoupon = new Coupon({
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: discount,
      startDate,
      expiryDate,
      maxDiscountAmount: maxAmount || null,
      minPurchaseAmount: minAmount || 0,
      description,
    });

    await newCoupon.save();

    res.status(200).json({ success: true, message: "Coupon added successfully!" });
  } catch (error) {
    console.error("Error adding coupon:", error);
    res.status(500).json({ success: false, message: "Server error while adding coupon." });
  }
};

const deleteCoupon = async(req, res)=>{
    try{

        const couponId = req.params.couponId
        await Coupon.findByIdAndDelete(couponId)
        res.json({ success: true });
    }catch (err) {
    res.json({ success: false, message: "Server error" });
  }
}


export default ({
    getCouponPage,
     addCoupon,
    deleteCoupon
})