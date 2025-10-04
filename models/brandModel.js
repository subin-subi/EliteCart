import mongoose from "mongoose";

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: [true, "Brand name is required"],
        trim: true,
        minLength: [1, "Brand name cannot be empty"],
        maxLength: [40, "Brand name must be less than 10 characters"],
        match: [/^[A-Za-z.\s]{3,40}$/, "Brand name must contain only alphabets, dots, and spaces"]
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isHidden: {
        type: Boolean,
        default: false,
    }
}, {
    timestamps: true
});

const Brand = mongoose.model("Brand", brandSchema);
export default Brand;
