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
  upload.any(), 
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

      // Attach images to each variant
      const variantsWithFiles = parsedVariants.map((variant, i) => {
        const mainImageFile = req.files.find(f => f.fieldname === `variantMainImage_${i}`);
        const subImageFiles = req.files.filter(f => f.fieldname.startsWith(`variantSubImages_${i}_`));

        return {
          volume: Number(variant.volume) || 0,
          stock: Number(variant.stock) || 0,
          price: Number(variant.price) || 0,
          discountPrice: variant.discountPrice ? Number(variant.discountPrice) : null,
          isBlocked: variant.isBlocked || false,
          mainImage: mainImageFile?.path || null,
          subImages: subImageFiles.map(f => f.path)
        };
      });

      const product = new Product({
        name,
        brand,
        category,
        description,
        variants: variantsWithFiles,
      });

      await product.save();

      return res.json({ success: true, message: "Product added successfully!" });
    } catch (error) {
      console.error("from add product", error);
      return res.json({ success: false, message: "Error adding product", error });
    }
  },
];

const getEditPage = async (req, res) => {
  try {
    
    const productId = req.params.id; 
    const product = await Product.findById(productId)
      .populate("brand")
      .populate("category")
      .lean();

    
    const brands = await Brand.find().lean();
    const categories = await Category.find().lean();

    res.render("admin/editProduct", { product, brands, categories });
  } catch (err) {
    console.log("getEditPage error:", err);
    res.status(500).send("Something went wrong");
  }
};


//   upload.any(),
//   async (req, res) => {
//     try {
//       const productId = req.params.id;
//       const { name, brand, category, description, variants, removeSubImages } = req.body;

//       const existingProduct = await Product.findById(productId);
//       if (!existingProduct) return res.status(404).json({ success: false, message: "Product not found" });

//       // Parse variants
//       let incomingVariants = [];
//       if (variants) incomingVariants = JSON.parse(variants);

//       // ------------------ Handle removed sub-images ------------------
//       if (removeSubImages) {
//         const removeArr = Array.isArray(removeSubImages) ? removeSubImages : [removeSubImages];
//         removeArr.forEach(item => {
//           const [vId, subIndex] = item.split(':');
//           const variant = existingProduct.variants.find(v => v._id.toString() === vId);
//           if (variant && variant.subImages && variant.subImages[subIndex]) {
//             variant.subImages.splice(subIndex, 1);
//           }
//         });
//       }

//       // ------------------ Update variants ------------------
//       incomingVariants.forEach(v => {
//         const index = parseInt(v.index);
//         if (isNaN(index)) return;

//         let existingVariant = existingProduct.variants[index] || {};

//         existingVariant.volume = v.volume || existingVariant.volume;
//         existingVariant.price = v.price || existingVariant.price;
//         existingVariant.stock = v.stock || existingVariant.stock;

//         // Main image
//         const mainFile = req.files.find(f => f.fieldname === `variants[${index}][mainImage]`);
//         if (mainFile) existingVariant.mainImage = mainFile.path;

//         // Sub images (merge new files)
//         const subFiles = req.files.filter(f => f.fieldname === `variants[${index}][subImages][]`);
//         if (subFiles.length > 0) {
//           existingVariant.subImages = existingVariant.subImages || [];
//           existingVariant.subImages.push(...subFiles.map(f => f.path));
//         }

//         existingProduct.variants[index] = existingVariant;
//       });

//       // ------------------ Update product fields ------------------
//       existingProduct.name = name || existingProduct.name;
//       existingProduct.brand = brand || existingProduct.brand;
//       existingProduct.category = category || existingProduct.category;
//       existingProduct.description = description || existingProduct.description;

//       const updatedProduct = await existingProduct.save();
//       res.json({ success: true, product: updatedProduct });

//     } catch (err) {
//       console.error("Error updating product:", err);
//       res.status(500).json({ success: false, message: "Server error" });
//     }
//   }
// ];
const editProduct = [
  upload.any(),

  async (req, res) => {
    try {
      const productId = req.params.id;
      const { name, brand, category, description, variants, removeSubImages } = req.body;

      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      // ------------------ Parse incoming variants ------------------
      let incomingVariants = [];
      if (variants) incomingVariants = JSON.parse(variants);

      // ------------------ Handle removed sub-images ------------------
      if (removeSubImages) {
        const removeArr = Array.isArray(removeSubImages) ? removeSubImages : [removeSubImages];
        removeArr.forEach(url => {
          existingProduct.variants.forEach(variant => {
            variant.subImages = variant.subImages.filter(img => img !== url);
          });
        });
      }

      // ------------------ Update variants ------------------
      incomingVariants.forEach(v => {
        const index = parseInt(v.index);
        if (isNaN(index)) return;

        let existingVariant = existingProduct.variants[index] || {};

        existingVariant.volume = v.volume || existingVariant.volume;
        existingVariant.price = v.price || existingVariant.price;
        existingVariant.stock = v.stock || existingVariant.stock;

        // -------- Main image --------
        const mainFile = req.files.find(f => f.fieldname === `variants[${index}][mainImage]`);
        if (mainFile) existingVariant.mainImage = mainFile.path;

        // -------- Sub images --------
        const subFiles = req.files.filter(f => f.fieldname === `variants[${index}][subImages]`);
        if (subFiles.length > 0) {
          existingVariant.subImages = existingVariant.subImages || [];
          existingVariant.subImages.push(...subFiles.map(f => f.path));
        }

        existingProduct.variants[index] = existingVariant;
      });

      // ------------------ Update product fields ------------------
      existingProduct.name = name || existingProduct.name;
      existingProduct.brand = brand || existingProduct.brand;
      existingProduct.category = category || existingProduct.category;
      existingProduct.description = description || existingProduct.description;

      const updatedProduct = await existingProduct.save();
      res.json({ success: true, product: updatedProduct });

    } catch (err) {
      console.error("Error updating product:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
];


export default {
               getaddProductPage ,
                addProduct,
                getEditPage,
                editProduct
               
};
