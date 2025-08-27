import User from "../../models/userModel.js";

const getUserList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const rawSearch = req.query.search || '';
        const search = String(rawSearch).trim();

        // Build search query across name, email, and mobileNo (as string)
        let searchQuery = {};
        if (search) {
            const isNumeric = /^\d+$/.test(search);
            const regex = new RegExp(search, 'i');

            const orConditions = [
                { name: { $regex: regex } },
                { email: { $regex: regex } },
            ];

            if (isNumeric) {
                // Match mobileNo by substring (treat number as string)
                orConditions.push({
                    $expr: { $regexMatch: { input: { $toString: "$mobileNo" }, regex: search } }
                });
            }

            searchQuery = { $or: orConditions };
        }

        // Get total count for pagination
        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

        // Get total blocked and active users count from database
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
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.status(500).send('server error');
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


// Unblock User
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