import User from "../../models/userModel.js";

//Get the list of users with pagination and search
const getUserList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

        // Build search query
        let searchQuery = {};
        if (search) {
            searchQuery = {
                name: { $regex: search, $options: 'i' } // Case-insensitive search
            };
        }

        // Get total count for pagination
        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalUsers / limit);

        const userList = await User.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        console.log('User list found:', userList.length, 'users');
        console.log('Search query:', search);
        console.log('Page:', page, 'of', totalPages);

        if (req.xhr) {
            return res.render('admin/userList', {
                userList,
                search,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalUsers,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    nextPage: page + 1,
                    prevPage: page - 1,
                }
            });
        }

        res.render('admin/userList', {
            userList,
            search,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers,
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
        console.log('Toggle request received:', req.body);
        
        const { userId } = req.body;
        
        if (!userId) {
            console.log('No userId provided');
            return res.status(400).json({ 
                success: false,
                error: "User ID is required" 
            });
        }

        console.log('Looking for user with ID:', userId);

        const user = await User.findById(userId);

        if (!user) {
            console.log('User not found with ID:', userId);
            return res.status(404).json({ 
                success: false,
                error: "User not found" 
            });
        }

        console.log('User found:', user.name, 'Current blocked status:', user.blocked);

        // Toggle block status
        user.blocked = !user.blocked;
        await user.save();

        console.log('User status updated. New blocked status:', user.blocked);

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