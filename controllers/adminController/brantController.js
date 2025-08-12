import { log } from "console";
import Brant from "../../models/brantModel.js"; 

const getBrant = async (req, res) => {
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
        const totalBrants = await Brant.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalBrants / limit);

        const brants = await Brant.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        console.log('Brands found:', brants.length, 'brands');
        console.log('Search query:', search);
        console.log('Page:', page, 'of', totalPages);

        if (req.xhr) {
            return res.render('admin/brant', {
                brants,
                search,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalBrants,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    nextPage: page + 1,
                    prevPage: page - 1,
                }
            });
        }

        res.render("admin/brant", {
            brants,
            search,
            pagination: {
                currentPage: page,
                totalPages,
                totalBrants,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            }
        });
    } catch (error) {
        console.error("Error fetching brants:", error);
        res.status(500).send("Internal Server Error");
    }
};

const addBrant = async (req, res) => {
    try {
        if (!req.body || !req.body.brantName) {
            return res.status(400).json({
                success: false,
                message: 'Brant name is required'
            });
        }

        const { brantName } = req.body;
        const trimmedBrantName = brantName.trim();

        if (!/^[A-Za-z]+$/.test(trimmedBrantName)) {
            return res.status(400).json({
                success: false,
                message: 'Brant name can only contain alphabets.'
            });
        }

        if (trimmedBrantName.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Brant name must not exceed 10 characters.'
            });
        }

        const formattedBrantName = trimmedBrantName.charAt(0).toUpperCase() + 
                                   trimmedBrantName.slice(1).toLowerCase();

        const existingBrant = await Brant.findOne({
            name: { $regex: new RegExp(`^${formattedBrantName}$`, 'i') }
        });

        if (existingBrant) {
            return res.status(400).json({
                success: false,
                message: 'Brant name already exists.'
            });
        }

        const newBrant = new Brant({
            name: formattedBrantName,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        });

        await newBrant.save();

        return res.status(201).json({
            success: true,
            message: 'Brant added successfully',
            brant: newBrant
        });
    } catch (error) {
        console.error('Error adding brant:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding brant.',
            error: error.message
        });
    }
};

const editBrant = async (req, res) => {
    try {
        const { brantId, brantName } = req.body;
        const trimmedBrantName = brantName.trim();

        if (!/^[A-Za-z]+$/.test(trimmedBrantName)) {
            return res.status(400).send('Brant name can only contain alphabets.');
        }
        if (trimmedBrantName.length > 10) {
            return res.status(400).send('Brant name must not exceed 10 characters.');
        }

        const formattedBrantName = trimmedBrantName.charAt(0).toUpperCase() + 
                                   trimmedBrantName.slice(1).toLowerCase();

        const existingBrant = await Brant.findOne({
            _id: { $ne: brantId },
            name: { $regex: new RegExp(`^${formattedBrantName}$`, 'i') }
        });

        if (existingBrant) {
            return res.status(400).send('Brant name already exists.');
        }

        await Brant.findByIdAndUpdate(brantId, {
            name: formattedBrantName,
        });

        res.redirect('/admin/brant');
    } catch (error) {
        console.error('Error editing brant:', error);
        res.status(500).send('Error editing brant.');
    }
};

const getBrantById = async (req, res) => {
    try {
        const brant = await Brant.findById(req.params.id);
        if (!brant) {
            return res.status(404).json({ success: false, message: "Brant not found" });
        }
        res.json({ success: true, brant });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const updateBrant = async (req, res) => {
    try {
        const { brantName: name } = req.body;
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        const brant = await Brant.findByIdAndUpdate(req.params.id, { name: formattedName }, { new: true });

        if (!brant) return res.status(404).json({ success: false, message: "Brant not found" });

        res.json({ success: true, message: "Brant updated successfully", brant });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// controllers/brantController.js
const blockBrant = async (req, res) => {
    try {
        const { id } = req.params;
        await Brant.findByIdAndUpdate(id, { isActive: false });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

const unblockBrant = async (req, res) => {
    try {
        const { id } = req.params;
        await Brant.findByIdAndUpdate(id, { isActive: true });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
};

export default {
    getBrant,
    addBrant,
    editBrant,
    getBrantById,
    updateBrant,
    blockBrant,
     unblockBrant
};
