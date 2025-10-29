import Cart from "../../models/cartModel.js";
import Product from "../../models/productModel.js";

const getCart = async (req, res) => {
  try {
    const userId = req.session.user;

    const cart = await Cart.findOne({ userId }).populate("items.productId").lean();
    let cartItems = [];
    let subtotal = 0;
    if (!cart) return res.render("user/cart", 
      { cartItems: [], subtotal: 0 });

if(cart){
  cartItems = cart.items.map(item =>{
    const product = item.productId;
    const variant = product.variants[item.variantIndex]
return {
  _id: item._id,
  productId : product,
  variant,
  productQuantity: item.quantity,
  total : item.total,
}



  })

  subtotal = cart.grandTotal
}
  
    res.render("user/cart", { cartItems, subtotal });
  } catch (err) {
    console.log("Error loading cart:", err);
    res.status(500).send("Something went wrong");
  }
};


const addToCart = async (req, res) => {
  try { 
    const userId = req.session.user
    const { productId, variantId } = req.body;


    const product = await Product.findById(productId);
if (!product) return res.status(404).json({ success: false, message: "Product not found" });

const variantIndex = product.variants.findIndex(v => v._id.toString() === variantId);
if (variantIndex === -1) return res.status(404).json({ success: false, message: "Variant not found" });

const variant = product.variants[variantIndex];
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
    const userId = req.session.user
    const { itemId } = req.params;
    const { change } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.json({ success: false, message: "Cart not found" });

    const item = cart.items.id(itemId);
    if (!item) return res.json({ success: false, message: "Item not found" });

        const newQuantity = item.quantity + change;

    if (item.quantity + change <= 1) {
      return res.json({ success: false, message: "Minimum quantity is 1" });
    }

    
    if (newQuantity > 10) {
      return res.json({ success: false, message: "Maximum quantity limit is 10" });
    }

    item.quantity += change;
    item.total = item.price * item.quantity;

    cart.grandTotal = cart.items.reduce((acc, i) => acc + i.total, 0);
    await cart.save();

    res.json({ success: true, grandTotal: cart.grandTotal, quantity: item.quantity });
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
