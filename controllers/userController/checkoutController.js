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

    if (!cart || cart.items.length === 0) {
  return res.status(400).render("partials/error", {
    message: "Your cart is empty. Please add items before proceeding to checkout."
  });
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

    
    const shippingCost = total > 1000 ? 0 : 50;

   
    const productIds = cartItems.map(i => i.productId).join(",");
    const variantIds = cartItems.map(i => i.variantId).join(",");

    res.render("user/checkout", {
      user,
      cart: cartItems,
      addresses,
      total,
      shippingCost,  
      productIds,
      variantIds,
    });

  } catch (error) {
    console.error("🛒 Cart Checkout Error:", error);
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

   
    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    let subtotal = 0;

    
    const items = [];

    for (const i of cart.items) {
      const product = i.productId;
      const variant = product.variants[i.variantIndex];

      if (!variant) {
        throw new Error(`Variant not found for product ${product._id}`);
      }

     
      if (variant.stock < i.quantity) {
        return res.json({
          success: false,
          message: `Not enough stock for ${product.name} (Available: ${variant.stock})`,
        });
      }

      const variantId = variant._id;
      const basePrice = variant.price;
      const discount = variant.discountPrice
        ? variant.price - variant.discountPrice
        : 0;
      const finalPrice = variant.discountPrice || variant.price;
      const total = finalPrice * i.quantity;

      subtotal += total;


      items.push({
        productId: product._id,
        variantId,
        quantity: i.quantity,
        basePrice,
        discountAmount: discount,
        finalPrice,
        total,
        appliedOffer: discount > 0 ? "Product Discount" : null,
      });

      
      await Product.updateOne(
        { _id: product._id, "variants._id": variantId },
        { $inc: { "variants.$.stock": -i.quantity } }
      );
    }

   
    const shippingCharge = subtotal >= 1000 ? 0 : 50;
    const grandTotal = subtotal + shippingCharge;

    
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
      shippingCharge,
      grandTotal,
      paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
    });

    await order.save();

    
    await Cart.deleteOne({ userId });

    res.json({
      success: true,
      message: "Order placed successfully!",
      orderId: order._id,
      shippingCharge,
      grandTotal,
    });
  } catch (error) {
    console.log("❌ Error placing order:", error);
    res.json({ success: false, message: "Error placing order" });
  }
};




export default {
  getCartCheckout,
  selectAddres,
  placeOrder
 };
