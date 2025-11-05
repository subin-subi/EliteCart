import Cart from "../../models/cartModel.js";
import Product from "../../models/productModel.js";
import Offer from "../../models/offerModel.js";


const getCart = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: [
          { path: "brand", select: "isActive" },
          { path: "category", select: "isActive" },
        ],
      });

    if (!cart) {
      return res.render("user/cart", { cartItems: [], subtotal: 0 });
    }

    // Fetch all active offers
    const now = new Date();
    const activeOffers = await Offer.find({
      isActive: true,
      isNonBlocked: true,
      startAt: { $lte: now },
      endAt: { $gte: now },
    }).lean();

    const validItems = [];
    const removedItemIds = [];

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) {
        removedItemIds.push(item._id);
        continue;
      }

      const isProductBlocked = product.isBlocked || product.status === "blocked";
      const isBrandBlocked = product.brand && !product.brand.isActive;
      const isCategoryInactive = product.category && !product.category.isActive;

      if (isProductBlocked || isBrandBlocked || isCategoryInactive) {
        removedItemIds.push(item._id);
        continue;
      }

      const variant = product.variants[item.variantIndex];

      // Calculate discount for this product
      let discountPercent = 0;
      let appliedOffer = null;

      const productOffers = activeOffers.filter(
        (offer) => offer.offerType === "PRODUCT" && offer.productId?.toString() === product._id.toString()
      );
      const categoryOffers = activeOffers.filter(
        (offer) => offer.offerType === "CATEGORY" && offer.categoryId?.toString() === product.category._id.toString()
      );

      if (productOffers.length > 0) {
        const bestProductOffer = productOffers.reduce((max, offer) =>
          offer.discountPercent > max.discountPercent ? offer : max
        );
        discountPercent = bestProductOffer.discountPercent;
        appliedOffer = bestProductOffer;
      }

      if (categoryOffers.length > 0) {
        const bestCategoryOffer = categoryOffers.reduce((max, offer) =>
          offer.discountPercent > max.discountPercent ? offer : max
        );
        if (bestCategoryOffer.discountPercent > discountPercent) {
          discountPercent = bestCategoryOffer.discountPercent;
          appliedOffer = bestCategoryOffer;
        }
      }

      // Calculate offer price
      let offerPrice = variant.price;
      if (discountPercent > 0) {
        offerPrice = Math.round(variant.price - (variant.price * discountPercent) / 100);
      }

      validItems.push({
        _id: item._id,
        productId: product,
        variant,
        productQuantity: item.quantity,
        total: offerPrice * item.quantity, // total with offer applied
        offerPrice, // send the discounted price to front-end
        discountPercent,
        appliedOfferName: appliedOffer?.name || null,
      });
    }

    if (removedItemIds.length > 0) {
      await Cart.updateOne(
        { _id: cart._id },
        { $pull: { items: { _id: { $in: removedItemIds } } } }
      );
    }

    const subtotal = validItems.reduce((sum, item) => sum + (item.total || 0), 0);

    res.render("user/cart", { cartItems: validItems, subtotal });
  } catch (err) {
    console.error("Error loading cart:", err);
    res.status(500).send("Something went wrong");
  }
};





const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, variantId } = req.body;

   
    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first" });
    }

  
    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ success: false, message: "Product not found" });


    const variantIndex = product.variants.findIndex(v => v._id.toString() === variantId);
    if (variantIndex === -1)
      return res.status(404).json({ success: false, message: "Variant not found" });

    const variant = product.variants[variantIndex];

    
    if (!variant.stock || variant.stock <= 0) {
      return res.status(400).json({ success: false, message: "Out of stock" });
    }

    const quantity = 1;
    const price = Number(variant.discountPrice || variant.price || 0);
    const total = Number(price * quantity);

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, variantIndex, quantity, price, total }],
        grandTotal: total
      });
    } else {
      const existingItem = cart.items.find(
        item => item.productId.toString() === productId && item.variantIndex === variantIndex
      );

      if (existingItem) {
       
        if (existingItem.quantity + 1 > variant.stock) {
          return res.status(400).json({ success: false, message: "Not enough stock" });
        }
        existingItem.quantity += quantity;
        existingItem.price = price;
        existingItem.total = existingItem.quantity * price;
      } else {
        cart.items.push({ productId, variantIndex, quantity, price, total });
      }

      cart.grandTotal = cart.items.reduce((acc, item) => acc + Number(item.total || 0), 0);
    }


    cart.items.forEach(item => {
      if (!item.price || !item.total) throw new Error("Item missing price or total");
    });

    await cart.save();
    res.json({ success: true, message: "Product added to cart" });

  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.user;
    const { itemId } = req.params;
    const { change } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ success: false, message: "Cart not found" });

    const item = cart.items.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

    const newQuantity = item.quantity + change;

    
    if (newQuantity < 1) {
      return res.json({ success: false, message: "Minimum quantity is 1" });
    }

    
    if (newQuantity > 10) {
      return res.json({ success: false, message: "Maximum quantity limit is 10" });
    }

    
    const product = await Product.findById(item.productId);
    if (!product)
      return res.json({ success: false, message: "Product not found" });

    const variant = product.variants[item.variantIndex];
    if (!variant)
      return res.json({ success: false, message: "Variant not found" });

    if (newQuantity > variant.stock) {
      return res.json({
        success: false,
        message: `Only ${variant.stock} left in stock`
      });
    }

    
    item.quantity = newQuantity;
    item.total = item.price * item.quantity;

    cart.grandTotal = cart.items.reduce((acc, i) => acc + i.total, 0);
    await cart.save();

    res.json({
      success: true,
      quantity: item.quantity,
      itemTotal: item.total,
      grandTotal: cart.grandTotal
    });

  } catch (err) {
    console.error("Update quantity error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};



const removeProduct = async(req, res)=>{
try{
  const userId = req.session.user;
  const  {itemId} = req.params

  const cart = await Cart.findOne({userId})
   if (!cart) return res.json({ success: false, message: "Cart not found" });

   cart.items = cart.items.filter(item => item._id.toString() !== itemId);
   cart.grandTotal = cart.items.reduce((acc, i)=> acc + i.total,0)
   await cart.save()

res.json({success:true})
  
}catch (err) {
    console.error("Removing quantity error:", err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
}




export default {
  getCart,
  addToCart,
  updateQuantity,
  removeProduct
};
