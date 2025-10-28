import Product from "../../models/productModel.js";
import Wishlist from "../../models/wishlistModel.js";
import Cart from "../../models/cartModel.js";

const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) return res.redirect("/login");

    // Populate only product details
    const wishlist = await Wishlist.findOne({ userId })
      .populate("items.productId")
      .lean();

    // Attach variant details manually
    if (wishlist && wishlist.items.length > 0) {
      wishlist.items = wishlist.items.map(item => {
        const product = item.productId;
        if (product && product.variants && item.variantId) {
          const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
          item.variant = variant || null;
        } else {
          item.variant = null;
        }
        return item;
      });
    }


    res.render("user/wishlist", {
      userid: userId,
      wishlist: wishlist || { items: [] }
    });

  } catch (err) {
    console.error("Error from wishlist:", err);
    res.status(500).send("Internal Server Error");
  }
};


const removeWishlist = async(req, res)=>{
  try{
    const userId = req.session.user;
    const {productId} = req.params;

    await Wishlist.updateOne({userId},
      {$pull:{items:{productId}}}
    );

    res.redirect("/wishlist")
  }catch(err){
     console.error("Error removing product from wishlist:", err);
    res.status(500).send("Internal Server Error");
  }
}

const addToCartFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId, variantId } = req.body;

    if (!userId) {
      return res.redirect("/login");
    }

    // ✅ Find the product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).render("error", { message: "Product not found" });

    // ✅ Find variant
    const variantIndex = product.variants.findIndex(
      (v) => v._id.toString() === variantId
    );
    if (variantIndex === -1)
      return res.status(404).render("error", { message: "Variant not found" });

    const variant = product.variants[variantIndex];
    const quantity = 1;
    const price = Number(variant.discountPrice || variant.price || 0);
    const total = price * quantity;

   
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, variantIndex, quantity, price, total }],
        grandTotal: total,
      });
    } else {
      const existingItem = cart.items.find(
        (item) =>
          item.productId.toString() === productId &&
          item.variantIndex === variantIndex
      );

      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.total = existingItem.quantity * price;
      } else {
        cart.items.push({ productId, variantIndex, quantity, price, total });
      }

      // Recalculate total
      cart.grandTotal = cart.items.reduce((acc, item) => acc + item.total, 0);
    }

    await cart.save();

    // ✅ Remove from wishlist
    await Wishlist.updateOne(
      { userId },
      { $pull: { items: { productId, variantId } } }
    );

  
    res.redirect("/wishlist?addedFromWishlist=true");

  } catch (err) {
    console.error("Error adding to cart from wishlist:", err);
    res.status(500).render("error", { message: "Something went wrong" });
  }
};



export default ({
  getWishlist,
  removeWishlist,
  addToCartFromWishlist
});


