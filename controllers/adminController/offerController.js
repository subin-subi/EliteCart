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
  const product = await Product.findById(productId).populate("category");
  if (!product) return;

  // Find all active offers related to this product or its category
  const offers = await Offer.find({
    isActive: true,
    $or: [{ productId }, { categoryId: product.category._id }],
  });

  // If no offers found, just return
  if (offers.length === 0) {
    return;
  }

  // Find best discount percentage
  const maxDiscount = Math.max(...offers.map((offer) => offer.discountPercent));

  
};


const toggleOffer = async (req, res) => {
  try {
    const { offerId, isActive } = req.body;
    console.log(offerId, isActive);

    if (!offerId)
      return res.status(400).json({ success: false, message: "Offer ID required" });

    const offer = await Offer.findById(offerId);
    if (!offer)
      return res.status(404).json({ success: false, message: "Offer not found" });

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
    return res.status(500).json({
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
        .status(400)
        .json({ success: false, message: "Offer ID is required." });

    if (!name || !offerType || !selectionId)
      return res
        .status(400)
        .json({ success: false, message: "Please fill all required fields." });

    const existingOffer = await Offer.findById(offerId);
    if (!existingOffer)
      return res
        .status(404)
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
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};




export default ({
    getOfferPage,
    addOffer,
   toggleOffer,
    editOffer
});
