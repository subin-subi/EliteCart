import Address from "../../models/addressModel.js"
import User from "../../models/userModel.js"

const getAddress = async (req, res) => {
  try {
    const userId = req.session.user; 
    const user = await User.findById(userId).lean();

   
    const page = parseInt(req.query.page) || 1;
    const limit = 3; 
    const skip = (page - 1) * limit;

    
    const addresses = await Address.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    
    const totalAddresses = await Address.countDocuments({ userId });
    const totalPages = Math.ceil(totalAddresses / limit);

    res.render("user/address", { 
      user, 
      addresses, 
      currentPage: page,
      totalPages
    });

  } catch (err) {
    console.log("Error fetching addresses:", err);
    res.status(500).send("Something went wrong");
  }
};



const saveAddress = async (req, res) => {
  try {

const userId = req.session.user
const user = await User.findById(userId)

    const { name, houseName, street, city, state, country, pincode, mobile } = req.body;

    // -------------------- Basic Validation --------------------
    if (!name || !houseName || !street || !city || !state || !country || !pincode || !mobile) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (name.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Name should be at least 3 characters",
      });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: "Pincode must be a valid 6-digit number",
      });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be a valid 10-digit number",
      });
    }

    
    // -------------------- Save to DB --------------------
    const newAddress = new Address({
      userId:user._id,
      name,
      houseName,
      street,
      city,
      state,
      country,
      pincode, // fixed typo
      mobile
    });

    await newAddress.save();

    return res.status(200).json({
      success: true,
      message: "Address saved successfully",
    });

  } catch (err) {
    console.error("Save address error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




const setDefaultAddress = async(req, res)=>{
    try{
        const userId = req.session.user
        const addressId = req.params.id

            if (!addressId) {
      return res.status(400).json({ success: false, message: "Address ID missing" });
    }

await Address.updateMany({userId},{$set:{isDefault: false}})
await Address.findByIdAndUpdate(addressId,{$set:{isDefault:true}})


res.json({success:true, message:"Default address updated"})
    }catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}



// Block address
const blockAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Address.findByIdAndUpdate(
      id,
      { $set: { isBlock: true } },
      { new: true }
    );

    if (!updated) return res.json({ success: false, message: "Address not found" });

    res.json({ success: true, message: "Address blocked successfully" });
  } catch (err) {
    console.error("Error blocking address:", err);
    res.json({ success: false, message: err.message });
  }
};

// Unblock address
const unblockAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Address.findByIdAndUpdate(
      id,
      { $set: { isBlock: false } },
      { new: true }
    );

    if (!updated) return res.json({ success: false, message: "Address not found" });

    res.json({ success: true, message: "Address unblocked successfully" });
  } catch (err) {
    console.error("Error unblocking address:", err);
    res.json({ success: false, message: err.message });
  }
};



const editAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const { name, houseName, street, city, state, country, pincode, mobile } = req.body;

    // Update the address
    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      {
        name,
        houseName,
        street,
        city,
        state,
        country,
        pincode,
        mobile
      },
      { new: true } 
    );

    if (!updatedAddress) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    res.json({ success: true, message: "Address updated successfully!", address: updatedAddress });

  } catch (err) {
    console.log("Error in editAddress:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




export default({
             getAddress,
             saveAddress,
             setDefaultAddress,
             blockAddress,
             unblockAddress,
             editAddress
})