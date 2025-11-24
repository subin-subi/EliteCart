import Offer from "../../models/offerModel.js"; 
import Product from "../../models/productModel.js";
import Category from "../../models/categoryModel.js";
import HTTP_STATUS from "../../utils/responseHandler.js";



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
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server Error");
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



const applyBestOffer = async (productId) => {
  try {
    const product = await Product.findById(productId).populate("category");
    if (!product) return null;

    const currentDate = new Date();

    // Find active offers for this product OR its category
    const offers = await Offer.find({
      isActive: true,
      isNonBlocked: true,
      startAt: { $lte: currentDate },
      endAt: { $gte: currentDate },
      $or: [
        { productId: productId },
        { categoryId: product.category._id }
      ]
    });

    if (offers.length === 0) return null;

    // Pick the offer with the highest discount
    const bestOffer = offers.reduce((best, offer) =>
      offer.discountPercent > best.discountPercent ? offer : best
    );

    return bestOffer; // Return offer object
  } catch (err) {
    console.error("Error applying best offer:", err);
    return null;
  }
};


const toggleOffer = async (req, res) => {
  try {
    const { offerId, isActive } = req.body;
    console.log(offerId, isActive);

    if (!offerId)
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Offer ID required" });

    const offer = await Offer.findById(offerId);
    if (!offer)
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Offer not found" });

    const now = new Date();

    //  Auto deactivate expired offers
    if (offer.endAt < now) {
      offer.isActive = false;
      offer.isNonBlocked = false;
      await offer.save();

      return res.json({
        success: false,
        message: "Offer has expired and is now deactivated.",
      });
    }

    //  Activate or deactivate based on input
    offer.isActive = isActive;

    // When offer is deactivated, also block it
    if (!isActive) {
      offer.isNonBlocked = false;
    } else {
      offer.isNonBlocked = true; // If activating, make sure it’s unblocked
    }

    await offer.save();

    // Apply or remove offer logic for products
    if (offer.offerType === "PRODUCT" && offer.productId) {
      await applyBestOffer(offer.productId);
    } else if (offer.offerType === "CATEGORY" && offer.categoryId) {
      const products = await Product.find({ category: offer.categoryId });
      for (const product of products) {
        await applyBestOffer(product._id);
      }
    }

    return res.json({
      success: true,
      message: `Offer ${isActive ? "activated" : "deactivated"} successfully.`,
    });
  } catch (error) {
    console.error("❌ Error toggling offer:", error);
    return  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
    });
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

    //  Validate required fields
    if (!offerId)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: "Offer ID is required." });

    if (!name || !offerType || !selectionId)
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: "Please fill all required fields." });

    const existingOffer = await Offer.findById(offerId);
    if (!existingOffer)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: "Offer not found." });

    //  Update basic offer fields
    existingOffer.name = name.trim();
    existingOffer.offerType = offerType;
    existingOffer.discountPercent = discountPercent;
    existingOffer.startAt = new Date(startAt);
    existingOffer.endAt = new Date(endAt);
    existingOffer.description = description.trim();

    //  Link offer to product or category
    if (offerType === "PRODUCT") {
      existingOffer.productId = selectionId;
      existingOffer.categoryId = null;
    } else if (offerType === "CATEGORY") {
      existingOffer.categoryId = selectionId;
      existingOffer.productId = null;
    }

    await existingOffer.save();

    //  Do not modify Product DB — only call applyBestOffer for recalculation
    if (offerType === "PRODUCT") {
      await applyBestOffer(selectionId);
    } else if (offerType === "CATEGORY") {
      const products = await Product.find({ category: selectionId });
      for (const product of products) {
        await applyBestOffer(product._id);
      }
    }

    return res.json({
      success: true,
      message: "Offer updated successfully!",
    });
  } catch (error) {
    console.error("❌ Error updating offer:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error." });
  }
};




export default ({
    getOfferPage,
    addOffer,
   toggleOffer,
    editOffer
});
