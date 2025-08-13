import User from "../../models/userModel.js";

//Get the list of users with pagination and search
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

const getToggle = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ 
                success: false,
                error: "User ID is required" 
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: "User not found" 
            });
        }

        // Toggle block status
        user.blocked = !user.blocked;
        await user.save();

        res.json({
            success: true,
            message: `User successfully ${user.blocked ? "blocked" : "unblocked"}`,
            blocked: user.blocked
        });
    } catch (error) {
        console.error('Error in getToggle:', error);
        res.status(500).json({ 
            success: false,
            error: "Failed to update user status" 
        });
    }
};

export default { getUserList, getToggle };