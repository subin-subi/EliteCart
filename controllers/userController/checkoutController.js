import User from "../../models/userModel.js";
import Cart from "../../models/cartModel.js";
import Address from "../../models/addressModel.js";
import Product from "../../models/productModel.js";
import Order from "../../models/orderModel.js"
import { console } from "inspector";



const getCartCheckout = async (req, res) => {
  try {
    const userId = req.session.user;

    const user = await User.findById(userId);
    const addresses = await Address.find({ userId });

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    console.log(cart)

    if (!cart || cart.items.length === 0) {
      return res.status(400).send("Cart is empty");
    }

    const cartItems = cart.items.map((item) => {
      const product = item.productId;
      const variant = product.variants[item.variantIndex];

      return {
        productId: product._id,
        variantId: variant?._id || null,
        name: product.name,
        mainImage: variant?.mainImage || "",
        volume: variant?.volume || 0,
        price: variant?.discountPrice || variant?.price || 0,
        quantity: item.quantity,
        total: item.total,
      };
    });

    const total = cart.grandTotal || cartItems.reduce((sum, i) => sum + i.total, 0);

    // Extract productIds and variantIds for EJS
    const productIds = cartItems.map(i => i.productId).join(",");
    const variantIds = cartItems.map(i => i.variantId).join(",");

    res.render("user/checkout", {
      user,
      singleProduct: null,
      cart: cartItems,
      addresses,
      total,
      productIds,   // ✅ Added
      variantIds,   // ✅ Added
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

    
    const product = await Product.findById(productId).populate("variants");

   
    if (!product) {
      console.log("❌ Product not found for ID:", productId);
      return res.status(404).send("Product not found");
    }

    
    const selectedVariant = product.variants.find(
      (v) => v._id.toString() === variant
    );

    if (!selectedVariant) {
      console.log("❌ Variant not found for ID:", variant);
      return res.status(404).send("Variant not found");
    }

   
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

const selectAddres = async (req, res) => {
  try {
    const { addressId } = req.body;
    req.session.selectedAddress = addressId; // store temporarily in session
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error selecting address' });
  }
};



const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { paymentMethod, addressId } = req.body;

    const address = await Address.findById(addressId);
    if (!address) {
      return res.json({ success: false, message: "Invalid address." });
    }

    // 🛒 Get user's cart
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    let subtotal = 0;

    // ✅ Build order items properly using variantIndex
    const items = cart.items.map((i) => {
      const product = i.productId;
      const variant = product.variants[i.variantIndex];

      if (!variant) {
        throw new Error(`Variant not found for product ${product._id}`);
      }

      const variantId = variant._id;
      const basePrice = variant.price;
      const discount = variant.discountPrice
        ? variant.price - variant.discountPrice
        : 0;
      const finalPrice = variant.discountPrice || variant.price;
      const total = finalPrice * i.quantity;

      subtotal += total;

      return {
        productId: product._id,
        variantId, // ✅ now correctly fetched
        quantity: i.quantity,
        basePrice,
        discountAmount: discount,
        finalPrice,
        total,
        appliedOffer: discount > 0 ? "Product Discount" : null,
      };
    });

    // 🧾 Create order
    const order = new Order({
      userId,
      items,
      address: {
        name: address.name,
        house: address.houseName,
        street: address.street,
        city: address.city,
        state: address.state,
        country: address.country,
        pincode: address.pincode,
        mobile: address.mobile,
      },
      paymentMethod,
      subtotal,
      grandTotal: subtotal,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
    });

    await order.save();

    // 🧹 Clear the cart after order placement
    await Cart.deleteOne({ userId });

    res.json({ success: true, orderId: order._id });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    res.json({ success: false, message: "Error placing order" });
  }
};



export default {
   getSingleCheckout,
  getCartCheckout,
  selectAddres,
  placeOrder
 };
