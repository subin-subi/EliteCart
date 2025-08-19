import Category from "../../models/categoryModel.js";

// Get all categories with search and pagination
const getCategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';

        // Build search query
        let searchQuery = { isHidden: false };
        if (search) {
            searchQuery.name = { $regex: search, $options: 'i' }; // Case-insensitive search
        }

        // Get total count for pagination
        const totalCategories = await Category.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCategories / limit);

        const categories = await Category.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        if (req.xhr) {
            return res.render('admin/category', {
                categories,
                search,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCategories,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    nextPage: page + 1,
                    prevPage: page - 1,
                }
            });
        }

        res.render("admin/category", {
            categories,
            search,
            pagination: {
                currentPage: page,
                totalPages,
                totalCategories,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            }
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Add new category
const addCategory = async (req, res) => {
    try {
        if (!req.body || !req.body.categoryName) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const { categoryName } = req.body;
        const trimmedCategoryName = categoryName.trim();

        if (!/^[A-Za-z]+$/.test(trimmedCategoryName)) {
            return res.status(400).json({
                success: false,
                message: 'Category name can only contain alphabets.'
            });
        }

        if (trimmedCategoryName.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Category name must not exceed 10 characters.'
            });
        }

        const formattedCategoryName =
            trimmedCategoryName.charAt(0).toUpperCase() +
            trimmedCategoryName.slice(1).toLowerCase();

        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${formattedCategoryName}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category name already exists.'
            });
        }

        const newCategory = new Category({
            name: formattedCategoryName,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        });

        await newCategory.save();

        return res.status(201).json({
            success: true,
            message: 'Category added successfully',
            category: newCategory
        });
    } catch (error) {
        console.error('Error adding category:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding category.',
            error: error.message
        });
    }
};

// Edit category
const editCategory = async (req, res) => {
    try {
        const { categoryId, categoryName } = req.body;
        const trimmedCategoryName = categoryName.trim();

        if (!/^[A-Za-z]+$/.test(trimmedCategoryName)) {
            return res.status(400).send('Category name can only contain alphabets.');
        }
        if (trimmedCategoryName.length > 10) {
            return res.status(400).send('Category name must not exceed 10 characters.');
        }

        const formattedCategoryName =
            trimmedCategoryName.charAt(0).toUpperCase() +
            trimmedCategoryName.slice(1).toLowerCase();

        const existingCategory = await Category.findOne({
            _id: { $ne: categoryId },
            name: { $regex: new RegExp(`^${formattedCategoryName}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).send('Category name already exists.');
        }

        await Category.findByIdAndUpdate(categoryId, {
            name: formattedCategoryName,
        });

        res.redirect('/admin/category');
    } catch (error) {
        console.error('Error editing category:', error);
        res.status(500).send('Error editing category.');
    }
};

// Get category by ID
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        res.json({ success: true, category });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { categoryName: name } = req.body;
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name: formattedName },
            { new: true }
        );

        if (!category)
            return res.status(404).json({ success: false, message: "Category not found" });

        res.json({ success: true, message: "Category updated successfully", category });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Block category
const blockCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.findByIdAndUpdate(id, { isActive: false });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

// Unblock category
const unblockCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.findByIdAndUpdate(id, { isActive: true });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

export default {
    getCategory,
    addCategory,
    editCategory,
    getCategoryById,
    updateCategory,
    blockCategory,
    unblockCategory
};
