import Category from "../../models/categoryModel.js";
import Brand from "../../models/brantModel.js";
import Product from "../../models/productModel.js";

 const getProduct = async (req, res) => {
  try {
    const categories = await Category.find();
    const brands = await Brand.find();
    const products = await Product.find().populate("categoryId").populate("brandId");

    res.render("admin/products", {
      categories,
      brands,
      products
    });
  } catch (error) {
    console.error("Error loading product page:", error);
    res.status(500).send("Internal Server Error");
  }
};

export default {getProduct}