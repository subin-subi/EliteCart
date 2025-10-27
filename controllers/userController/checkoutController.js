import User from "../../models/userModel.js"
import Cart from "../../models/cartModel.js"
import Address from "../../models/addressModel.js"
import  editAddress  from "../userController/addressController.js";
import  saveAddress  from "../userController/addressController.js";
 

const getCheckout = async (req, res) => {
  try {
    
    const userId = req.session.user; 
    const user = await User.findById(userId); 

    const defaultAddress = await Address.findOne({userId , isDefault : true})

    const cart = await Cart.findOne({ userId }).populate("items.productId");

    res.render("user/checkout", {
      user,          
      cart,   
      defaultAddress       
    });
  } catch (error) {
    console.error("Checkout render error:", error);
    res.status(500).send("Internal Server Error");
  }
};


export default{getCheckout}