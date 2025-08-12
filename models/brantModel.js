import mongoose from "mongoose";

const brantSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: [true, "Brant name is required"],
        trim: true,
        minLength: [1, "Brant name cannot be empty"],
        maxLength: [10, "Brant name must be less than 10 characters"],
        match: [/^[a-zA-Z]+$/, "Brant name must contain only alphabets"]
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

const Brant = mongoose.model("Brant", brantSchema);
export default Brant;
