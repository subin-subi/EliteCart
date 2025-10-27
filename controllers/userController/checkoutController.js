import User from "../../models/userModel.js";
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Product from "../../models/productModel.js";



const getCartCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    // ✅ Fetch user and default address
    const user = await User.findById(userId);
    const addresses = await Address.find({ userId });

    // ✅ Fetch user's cart with populated products
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).send("Cart is empty");
    }

    // ✅ Build the cart items with variant details
    const cartItems = cart.items.map((item) => {
      const product = item.productId;
      const variant = product.variants[item.variantIndex]; // ✅ Using your schema’s variantIndex

      return {
        name: product.name,
        mainImage: variant?.mainImage || "",
        volume: variant?.volume || 0,
        price: variant?.discountPrice || variant?.price || 0,
        quantity: item.quantity,
        total: item.total,
      };
    });

    // ✅ Calculate total from cart model (already stored)
    const total = cart.grandTotal || cartItems.reduce((sum, i) => sum + i.total, 0);

    // ✅ Render checkout page
 res.render("user/checkout", {
  user,
  singleProduct: null,
  cart: cartItems,
 addresses,
  total,
});

  } catch (error) {
    console.error("🛒 Cart Checkout Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getSingleCheckout = async (req, res) => {
  try {
    const userId = req.session.user;
    const { total, productId, variant } = req.query;

    const user = await User.findById(userId);
const addresses = await Address.find({ userId });;

    // ✅ Fetch product
    const product = await Product.findById(productId).populate("variants");

    // ✅ Check if product exists
    if (!product) {
      console.log("❌ Product not found for ID:", productId);
      return res.status(404).send("Product not found");
    }

    // ✅ Find variant safely
    const selectedVariant = product.variants.find(
      (v) => v._id.toString() === variant
    );

    if (!selectedVariant) {
      console.log("❌ Variant not found for ID:", variant);
      return res.status(404).send("Variant not found");
    }

    // ✅ Prepare singleProduct data
    const singleProduct = {
      name: product.name,
      mainImage: selectedVariant?.mainImage || "",
      volume: selectedVariant?.volume || 0,
      price: selectedVariant?.discountPrice || selectedVariant?.price,
    };

    res.render("user/checkout", {
      user,
      singleProduct,
      cart: null,
      addresses,
      total,
    });
  } catch (error) {
    console.error("Single Checkout Error:", error);
    res.status(500).send("Internal Server Error");
  }
};




export default { getSingleCheckout,
  getCartCheckout
 };
