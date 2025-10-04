import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: [true, "Category name is required"],
        trim: true,
        minLength: [1, "Category name cannot be empty"],
        maxLength: [40, "Category name must be less than 10 characters"],
        match: [/^[A-Za-z.\s]{3,40}$/, "Category name must contain only alphabets, dots, and spaces"]
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

const Category = mongoose.model("Category", categorySchema);
export default Category;
