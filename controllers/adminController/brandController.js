import { log } from "console";
import Brand from "../../models/brandModel.js"; 

const getBrand = async (req, res) => {
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
        const totalBrands = await Brand.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBrands / limit);

        const brands = await Brand.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

       
        if (req.xhr) {
            return res.render('admin/brand', {
                brands,
                search,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalBrands,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    nextPage: page + 1,
                    prevPage: page - 1,
                }
            });
        }

        res.render("admin/brand", {
            brands,
            search,
            pagination: {
                currentPage: page,
                totalPages,
                totalBrands,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            }
        });
    } catch (error) {
        console.error("Error fetching brands:", error);
        res.status(500).send("Internal Server Error");
    }
};

const addBrand = async (req, res) => {
    try {
        if (!req.body || !req.body.brandName) {
            return res.status(400).json({
                success: false,
                message: 'Brand name is required'
            });
        }

        const { brandName } = req.body;
        const trimmedBrandName = brandName.trim();

        if (!/^[A-Za-z]+$/.test(trimmedBrandName)) {
            return res.status(400).json({
                success: false,
                message: 'Brand name can only contain alphabets.'
            });
        }

        if (trimmedBrandName.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Brand name must not exceed 10 characters.'
            });
        }

        const formattedBrandName = trimmedBrandName.charAt(0).toUpperCase() + 
                                   trimmedBrandName.slice(1).toLowerCase();

        const existingBrand = await Brand.findOne({
            name: { $regex: new RegExp(`^${formattedBrandName}$`, 'i') }
        });

        if (existingBrand) {
            return res.status(400).json({
                success: false,
                message: 'Brand name already exists.'
            });
        }

        const newBrand = new Brand({
            name: formattedBrandName,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        });

        await newBrand.save();

        return res.status(201).json({
            success: true,
            message: 'Brand added successfully',
            brand: newBrand
        });
    } catch (error) {
        console.error('Error adding brand:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding brand.',
            error: error.message
        });
    }
};

const editBrand = async (req, res) => {
    try {
        const { brandId, brandName } = req.body;
        const trimmedBrandName = brandName.trim();

        if (!/^[A-Za-z]+$/.test(trimmedBrandName)) {
            return res.status(400).send('Brand name can only contain alphabets.');
        }
        if (trimmedBrandName.length > 10) {
            return res.status(400).send('Brand name must not exceed 10 characters.');
        }

        const formattedBrandName = trimmedBrandName.charAt(0).toUpperCase() + 
                                   trimmedBrandName.slice(1).toLowerCase();

        const existingBrand = await Brand.findOne({
            _id: { $ne: brandId },
            name: { $regex: new RegExp(`^${formattedBrandName}$`, 'i') }
        });

        if (existingBrand) {
            return res.status(400).send('Brand name already exists.');
        }

        await Brand.findByIdAndUpdate(brandId, {
            name: formattedBrandName,
        });

        res.redirect('/admin/brand');
    } catch (error) {
        console.error('Error editing brand:', error);
        res.status(500).send('Error editing brand.');
    }
};

const getBrandById = async (req, res) => {
    try {
        const brand = await Brand.findById(req.params.id);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }
        res.json({ success: true, brand });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const updateBrand = async (req, res) => {
    try {
        const { brandName: name } = req.body;
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        const brand = await Brand.findByIdAndUpdate(req.params.id, { name: formattedName }, { new: true });

        if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

        res.json({ success: true, message: "Brand updated successfully", brand });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// controllers/brandController.js
const blockBrand = async (req, res) => {
    try {
        const { id } = req.params;
        await Brand.findByIdAndUpdate(id, { isActive: false });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

const unblockBrand = async (req, res) => {
    try {
        const { id } = req.params;
        await Brand.findByIdAndUpdate(id, { isActive: true });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

export default {
    getBrand,
    addBrand,
    editBrand,
    getBrandById,
    updateBrand,
    blockBrand,
     unblockBrand
};
