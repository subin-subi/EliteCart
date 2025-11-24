import User from "../../models/userModel.js";
import HTTP_STATUS from "../../utils/responseHandler.js";

const getRedeem = async (req, res) => {
  try {
    const userId = req.session.user; 
    if (!userId) return res.redirect("/login"); 

    const user = await User.findById(userId);

    res.render("user/redeem", { user }); 
  } catch (err) {
    console.log(err);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server Error");
  }
};

export default{ getRedeem };
