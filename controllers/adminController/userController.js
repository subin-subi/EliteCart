import User from "../../models/userModel.js";
import HTTP_STATUS from "../../utils/responseHandler.js";

const getUserList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const rawSearch = req.query.search || '';
        const search = String(rawSearch).trim();

       
           let searchQuery = { };
        if (search) {
           searchQuery.name = { $regex: `^${search}`, $options: 'i' }; 
        }


        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

        
        const totalBlockedUsers = await User.countDocuments({ ...searchQuery, blocked: true });
        const totalActiveUsers = await User.countDocuments({ ...searchQuery, blocked: false });

        const userList = await User.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('admin/userList', {
            userList,
            search,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers,
                totalBlockedUsers,
                totalActiveUsers,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            }
        });
    } catch (error) {
        console.error('Error in getUserList:', error);
        if (req.xhr) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch users' });
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('server error');
    }
};







// Block User
const blockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { blocked: true },
      { new: true }
    );

    if (!updatedUser) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User blocked successfully" });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.json({ success: false, message: err.message });
  }
};



const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;   

    await User.findByIdAndUpdate(id, { blocked: false });

    res.json({ success: true, message: "User unblocked successfully" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
};


export default { getUserList,blockUser,unblockUser };