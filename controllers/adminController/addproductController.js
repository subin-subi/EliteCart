import Category from "../../models/categoryModel.js";
import Brand from "../../models/brandModel.js";
import Product from "../../models/productModel.js";
import upload from "../../utils/multer.js"





const getaddProductPage = async (req, res) => {
  try {
const brands  = await Brand.find({isHidden : false})
const categories = await Category.find({isHidden: false})



    res.render("admin/addProduct",{
        brands,
        categories
    })
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send("Server error");
  }
};



const addProduct = [
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "subImages", maxCount: 3 },
  ]),
  

  async (req, res) => {
    try {
     
      const { name, brand, category, description, variantsData } = req.body;
  
      // Parse variants safely
      let parsedVariants = [];
      try {
        parsedVariants = JSON.parse(variantsData);
      } catch (e) {
        return res.json({ success: false, message: "Invalid variants data" });
      }

      const variantsWithNumbers = parsedVariants.map((v) => ({
        volume: v.volume ? Number(v.volume) : 0,
        stock: v.stock !== undefined && v.stock !== "" ? Number(v.stock) : 0,
        price: v.price !== undefined && v.price !== "" ? Number(v.price) : 0,
        discountPrice: v.discountPrice ? Number(v.discountPrice) : null,
        isBlocked: v.isBlocked || false,
        mainImage: req.files?.mainImage?.[0]?.path || null,
        subImages: req.files?.subImages?.map((img) => img.path) || [],
      }));

      const product = new Product({
        name,
        brand,
        category,
        description,
        variants: variantsWithNumbers,
      });

      await product.save();

await product.save();
return res.json({ success: true, message: "Product added successfully!" });

    } catch (error) {
      console.error("from add product", error);
      return res.json({ success: false, message: "Error adding product", error });
    }
  },
];


export default {
               getaddProductPage ,
                addProduct
};
