import { console } from "inspector";
import User from "../../models/userModel.js";
import upload from "../../utils/multer.js"


const getProfile = async (req, res) => {
    try {
        const userId = req.session.user
        

          
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send("User not found");
        }
        const isGoogleUser = !!user.googleId;
       
        res.render("user/profile", { user, isGoogleUser });
    } catch (err) {
        console.error("Error from getProfile:", err);
        res.status(500).send("Internal Server Error");
    }
};

const editDetail = [
  upload.single('profileImage'),
  async (req, res) => {
    try {
      const userId = req.session.user; // must be MongoDB _id
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const googleid = user.googleId; // will now be available
      console.log("Google ID:", googleid);

      const { name, email, phone } = req.body;
      const updateData = {};

      if (name?.trim()) updateData.name = name.trim();

      if (email?.trim()) {
        const existingEmailUser = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: userId } });
        if (existingEmailUser) {
          return res.status(400).json({ message: 'This email is already in use by another user.' });
        }
        updateData.email = email.trim().toLowerCase();
      }

      if (phone?.trim()) {
        const existingUser = await User.findOne({ mobileNo: phone.trim(), _id: { $ne: userId } });
        if (existingUser) {
          return res.status(400).json({ message: 'This phone number is already in use by another user.' });
        }
        updateData.mobileNo = phone.trim();
      }

      if (req.file?.path) updateData.profileImage = req.file.path;

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

      res.status(200).json({ message: 'Profile updated', user: updatedUser });
    } catch (err) {
      console.error('Error in editDetail:', err);
      res.status(500).json({ message: 'Something went wrong' });
    }
  }
];



export default {getProfile, editDetail}