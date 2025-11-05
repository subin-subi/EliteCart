import Offer from "../../models/offerModel.js"; 
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";



 const getOfferPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";

    // Search query
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { offerType: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const totalOffers = await Offer.countDocuments(query);
    const totalPages = Math.ceil(totalOffers / limit);

    // Fetch offers with pagination
    const offers = await Offer.find(query)
      .populate("productId", "name")
      .populate("categoryId", "name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    // 🔹 Fetch products & categories for dropdowns
    const products = await Product.find({ isBlocked: false }).select("name");
    const categories = await Category.find({ isActive: true }).select("name");



    // Render page
    res.render("admin/offer", {
      offers,
      products,
      categories,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (err) {
    console.error("Error loading offer page:", err);
    res.status(500).send("Server Error");
  }
};



const addOffer = async (req, res) => {
  try {
    const {
      name,
      offerType,
      selectionId,
      discountPercent,
      startAt,
      endAt,
      description,
    } = req.body;

    const offerData = {
      name,
      offerType,
      discountPercent,
      startAt,
      endAt,
      isActive: true,
      isNonBlocked: true,
      description,
    };

    if (offerType === "PRODUCT") offerData.productId = selectionId;
    if (offerType === "CATEGORY") offerData.categoryId = selectionId;

    const newOffer = new Offer(offerData);
    await newOffer.save();

    // Apply offer to related products
    if (offerType === "PRODUCT") {
      await applyBestOffer(selectionId);
    } else if (offerType === "CATEGORY") {
      const products = await Product.find({ category: selectionId });
      for (const product of products) {
        await applyBestOffer(product._id);
      }
    }

    res.json({
      success: true,
      message: "Offer added and products updated successfully with best discount!",
    });
  } catch (err) {
    console.error("Error adding offer:", err);
    res.json({ success: false, message: "Failed to add offer." });
  }
};


// using inside addOffer
const applyBestOffer = async (productId) => {
  const product = await Product.findById(productId).populate("category");
  if (!product) return;

  
  const offers = await Offer.find({
    isActive: true,
    $or: [{ productId }, { categoryId: product.category._id }],
  });

    if (offers.length === 0) {
    product.variants.forEach((variant) => (variant.discountPrice = null));
    await product.save();
    return;
  }
  
  const maxDiscount = Math.max(...offers.map((offer) => offer.discountPercent));

  
  product.variants.forEach((variant) => {
    const newDiscountPrice = Math.round(
      variant.price - (variant.price * maxDiscount) / 100
    );
    variant.discountPrice = newDiscountPrice;
  });

  await product.save();
};




const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.offerId;

    const deletedOffer= await Offer.findByIdAndUpdate(
      offerId,
      { isNonBlocked: false },
      { new: true }
    );

    if (!deletedOffer) {
      return res.json({ success: false, message: "Offer not found" });
    }

    res.json({ success: true, message: "Offer deleted successfully" });
  } catch (err) {
    console.error("Error deleting offer :", err);
    res.json({ success: false, message: "Server error" });
  }
};


const editOffer = async (req, res) => {
  try {
    const {
      offerId,
      name,
      offerType,
      selectionId,
      discountPercent,
      startAt,
      endAt,
      description,
    } = req.body;

    if (!offerId)
      return res.status(400).json({ success: false, message: "Offer ID is required." });

    if (!name || !offerType || !selectionId)
      return res
        .status(400)
        .json({ success: false, message: "Please fill all required fields." });


    const existingOffer = await Offer.findById(offerId);
    if (!existingOffer)
      return res.status(404).json({ success: false, message: "Offer not found." });

   
    existingOffer.name = name.trim();
    existingOffer.offerType = offerType;
    existingOffer.discountPercent = discountPercent;
    existingOffer.startAt = new Date(startAt);
    existingOffer.endAt = new Date(endAt);
    existingOffer.description = description.trim();

    
    if (offerType === "PRODUCT") {
      existingOffer.productId = selectionId;
      existingOffer.categoryId = null;
    } else if (offerType === "CATEGORY") {
      existingOffer.categoryId = selectionId;
      existingOffer.productId = null;
    }

 
    await existingOffer.save();

   
    if (offerType === "PRODUCT") {
      await Product.updateOne(
        { _id: selectionId },
        { $set: { offerApplied: true, offerPercent: discountPercent } }
      );
    } else if (offerType === "CATEGORY") {
      await Category.updateOne(
        { _id: selectionId },
        { $set: { offerApplied: true, offerPercent: discountPercent } }
      );
    }

    return res.json({ success: true, message: "Offer updated successfully!" });
  } catch (error) {
    console.error("❌ Error updating offer:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};


export default ({
    getOfferPage,
    addOffer,
    deleteOffer,
    editOffer
});
