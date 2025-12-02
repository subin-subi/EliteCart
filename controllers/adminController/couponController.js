
import Coupon from "../../models/couponModel.js"
import HTTP_STATUS from "../../utils/responseHandler.js";

const getCouponPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : "";

  
    const query = search
      ? { code: { $regex: search, $options: "i" } } 
      : {};

    
    const totalCoupons = await Coupon.countDocuments(query);
    const totalPages = Math.ceil(totalCoupons / limit);

    
    const coupons = await Coupon.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin/coupon", {
      coupons,
      currentPage: page,
      totalPages,
      search,
    });

  } catch (err) {
    console.log("Error loading coupon page:", err);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};




const addCoupon = async (req, res) => {
  try {
    const { 
      code,
      discountType,
      discount,
      startDate,
      expiryDate,
      maxAmount,
      minAmount,
      description 
    } = req.body;

    // Basic validation
    if (!code || !discountType || !discount || !startDate || !expiryDate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    // Expiry date check
    if (new Date(expiryDate) <= new Date(startDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Expiry date must be after start date.",
      });
    }

    
    if (discountType === "flat") {
      const minPurchase = Number(minAmount);
      const flatDiscount = Number(discount);

      if (minPurchase <= 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Minimum purchase amount must be greater than 0 for flat discounts.",
        });
      }

      const maxAllowed = minPurchase * 0.7; 
      if (flatDiscount > maxAllowed) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Flat discount cannot exceed 70% of the minimum purchase amount. (Max allowed ₹${maxAllowed.toFixed(2)})`,
        });
      }
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

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Coupon added successfully!",
    });
  } catch (error) {
    console.error("Error adding coupon:", error);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error while adding coupon.",
    });
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
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Coupon code must be 6–12 characters long." });
    }

    if (!minAmount || isNaN(minAmount) || Number(minAmount) <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Please enter a valid minimum amount." });
    }

   

    if (!discountType || !["percentage", "flat"].includes(discountType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Invalid discount type." });
    }

    if (!discount || isNaN(discount) || Number(discount) <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Please enter a valid discount value." });
    }

    if (discountType === "percentage" && Number(discount) > 90) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Percentage discount cannot exceed 90%." });
    }

    if (!startDate || !expiryDate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Start and expiry dates are required." });
    }

    if (new Date(expiryDate) <= new Date(startDate)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Expiry date must be after start date." });
    }

    if (!description || description.trim().length < 7) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Description must be at least 7 characters long." });
    }

    // === Update Coupon ===
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      couponId,
      {
        code: code.trim(),
       minPurchaseAmount: minAmount,
        maxDiscountAmount:maxAmount,
        discountType,
        discountValue :discount,
        startDate,
        expiryDate,
        description: description.trim(),
      },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Coupon not found." });
    }

    res.json({
      success: true,
      message: "Coupon updated successfully!",
      coupon: updatedCoupon
    });

  } catch (err) {
    console.error("Error updating coupon:", err);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error while updating coupon." });
  }
};


const toggleCouponStatus = async (req, res) => {
  try {
    const { couponId, isActive } = req.body;

    if (!couponId)
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Coupon ID required" });

    const coupon = await Coupon.findById(couponId);
    if (!coupon)
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Coupon not found" });

    // Check if trying to activate an expired coupon
    const currentDate = new Date();
    if (isActive && coupon.expiryDate < currentDate) {

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Cannot activate — this coupon has already expired.",
      });
    }

    // Update both isActive and isNonBlocked together
    coupon.isActive = isActive;
    coupon.isNonBlocked = isActive ? true : false;

    await coupon.save();

    res.json({
      success: true,
      message: `Coupon ${isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (err) {
    console.error("Error toggling coupon:", err);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};



export default ({
    getCouponPage,
     addCoupon,
    toggleCouponStatus,
    editCoupon
})