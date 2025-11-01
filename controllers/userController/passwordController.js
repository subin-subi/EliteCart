import User from "../../models/userModel.js"
import bcrypt from "bcrypt"

const getPage = async (req, res)=>{
    try{
        let user = req.session.user
        res.render("user/editPassword",{user})
    }catch(err){
        console.log(err)
    }
}


 const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

  
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "New password and confirm password do not match." });
    }

    
    const passwordRegex = /^(?=.*[A-Z])(?=\S+$).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must have 1 uppercase letter, no spaces, and minimum 8 characters."
      });
    }


    const userId = req.session.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

   
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }


    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: "Password changed successfully." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error while changing password." });
  }
};

export default {getPage , changePassword}