
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

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.couponId;

    const deletedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      { isActive: false },
      { new: true }
    );

    if (!deletedCoupon) {
      return res.json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    console.error("Error deleting coupon:", err);
    res.json({ success: false, message: "Server error" });
  }
};




const editCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    const {
      code,
      minAmount,
      maxAmount,
      discountType,
      discount,
      startDate,
      expiryDate,
      description
    } = req.body;

    // === Server-side Validation ===
    if (!code || code.trim().length < 6 || code.trim().length > 12) {
      return res.status(400).json({ success: false, message: "Coupon code must be 6–12 characters long." });
    }

    if (!minAmount || isNaN(minAmount) || Number(minAmount) <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid minimum amount." });
    }

    if (!maxAmount || isNaN(maxAmount) || Number(maxAmount) <= Number(minAmount)) {
      return res.status(400).json({ success: false, message: "Maximum amount must be greater than minimum amount." });
    }

    if (!discountType || !["percentage", "flat"].includes(discountType)) {
      return res.status(400).json({ success: false, message: "Invalid discount type." });
    }

    if (!discount || isNaN(discount) || Number(discount) <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid discount value." });
    }

    if (discountType === "percentage" && Number(discount) > 90) {
      return res.status(400).json({ success: false, message: "Percentage discount cannot exceed 90%." });
    }

    if (!startDate || !expiryDate) {
      return res.status(400).json({ success: false, message: "Start and expiry dates are required." });
    }

    if (new Date(expiryDate) <= new Date(startDate)) {
      return res.status(400).json({ success: false, message: "Expiry date must be after start date." });
    }

    if (!description || description.trim().length < 10) {
      return res.status(400).json({ success: false, message: "Description must be at least 10 characters long." });
    }

    // === Update Coupon ===
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        code: code.trim(),
        minAmount,
        maxAmount,
        discountType,
        discount,
        startDate,
        expiryDate,
        description: description.trim(),
      },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }

    res.json({
      success: true,
      message: "Coupon updated successfully!",
      coupon: updatedCoupon
    });

  } catch (err) {
    console.error("Error updating coupon:", err);
    res.status(500).json({ success: false, message: "Server error while updating coupon." });
  }
};

export default ({
    getCouponPage,
     addCoupon,
    deleteCoupon,
    editCoupon
})