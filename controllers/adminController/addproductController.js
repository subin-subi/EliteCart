import Category from "../../models/categoryModel.js";
import Brand from "../../models/brandModel.js";
import Product from "../../models/productModel.js";
import upload from "../../utils/multer.js";
import HTTP_STATUS from "../../utils/responseHandler.js";

const getaddProductPage = async (req, res) => {
  try {
    const brands = await Brand.find({ isHidden: false });
    const categories = await Category.find({ isHidden: false });

    res.render("admin/addProduct", {
      brands,
      categories,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server error");
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
        const mainImageFile = req.files.find(
          (f) => f.fieldname === `variantMainImage_${i}`
        );
        const subImageFiles = req.files.filter((f) =>
          f.fieldname.startsWith(`variantSubImages_${i}_`)
        );

        return {
          volume: Number(variant.volume) || 0,
          stock: Number(variant.stock) || 0,
          price: Number(variant.price) || 0,
          discountPrice: variant.discountPrice
            ? Number(variant.discountPrice)
            : null,
          isBlocked: variant.isBlocked || false,
          mainImage: mainImageFile?.path || null,
          subImages: subImageFiles.map((f) => f.path),
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

      return res.json({
        success: true,
        message: "Product added successfully!",
      });
    } catch (error) {
      console.error("from add product", error);
      return res.json({
        success: false,
        message: "Error adding product",
        error,
      });
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
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Something went wrong");
  }
};

const editProduct = [
  upload.any(),

  async (req, res) => {
    try {
      const productId = req.params.id;
      const { name, brand, category, description, variants, removeSubImages } =
        req.body;

      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        return res
          .status(HTTP_STATUS.NOT_FOUND)
          .json({ success: false, message: "Product not found" });
      }

      // ------------------ Parse incoming variants ------------------
      let incomingVariants = [];
      if (variants) incomingVariants = JSON.parse(variants);

      // ------------------ Handle removed sub-images ------------------
      if (removeSubImages) {
        const removeArr = Array.isArray(removeSubImages)
          ? removeSubImages
          : [removeSubImages];
        removeArr.forEach((url) => {
          existingProduct.variants.forEach((variant) => {
            variant.subImages = variant.subImages.filter((img) => img !== url);
          });
        });
      }

      // ------------------ Update variants ------------------
      incomingVariants.forEach((v) => {
        const index = parseInt(v.index);
        if (isNaN(index)) return;

        let existingVariant = existingProduct.variants[index] || {};

        if (v.volume !== undefined && v.volume !== "") {
          existingVariant.volume = v.volume;
        }

        if (v.price !== undefined && v.price !== "") {
          existingVariant.price = Number(v.price);
        }

        if (v.stock !== undefined && v.stock !== "") {
          existingVariant.stock = Number(v.stock);
        }

        // -------- Main image --------
        const mainFile = req.files.find(
          (f) => f.fieldname === `variants[${index}][mainImage]`
        );
        if (mainFile) existingVariant.mainImage = mainFile.path;

        // -------- Sub images --------
        const subFiles = req.files.filter(
          (f) => f.fieldname === `variants[${index}][subImages]`
        );
        if (subFiles.length > 0) {
          existingVariant.subImages = existingVariant.subImages || [];
          existingVariant.subImages.push(...subFiles.map((f) => f.path));
        }

        existingProduct.variants[index] = existingVariant;
      });

      // ------------------ Update product fields ------------------
      if (name && name.trim()) existingProduct.name = name.trim();
      if (brand && brand.trim()) existingProduct.brand = brand.trim();
      if (category && category.trim())
        existingProduct.category = category.trim();
      if (description && description.trim())
        existingProduct.description = description.trim();

      const updatedProduct = await existingProduct.save();
      res.json({ success: true, product: updatedProduct });
    } catch (err) {
      console.error("Error updating product:", err);
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: "Server error" });
    }
  },
];

const addNewVariants = [
  // Accept any file field
  upload.any(),

  async (req, res) => {
    try {
      const productId = req.params.id;

      // Validate product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }

      // Ensure variants exist
      if (
        !Array.isArray(req.body.newVariants) ||
        req.body.newVariants.length === 0
      ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "No variants provided",
        });
      }

      const variantsToAdd = [];

      for (let i = 0; i < req.body.newVariants.length; i++) {
        const variant = req.body.newVariants[i];

        const volume = Number(variant.volume);
        const price = parseFloat(variant.price);
        const stock = parseInt(variant.stock);

        // ===== VALIDATIONS =====
        if (isNaN(volume) || volume <= 0) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: `Variant ${i + 1}: Volume must be a positive number`,
          });
        }
        if (!price || price <= 0) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: `Variant ${i + 1}: Price must be a positive number`,
          });
        }
        if (stock < 0) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: `Variant ${i + 1}: Stock must be a non-negative number`,
          });
        }

        const mainImageFile = req.files.find(
          (file) => file.fieldname === `newVariants[${i}][mainImage]`
        );
        const subImageFiles = req.files.filter(
          (file) => file.fieldname === `newVariants[${i}][subImages]`
        );

        if (!mainImageFile) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: `Variant ${i + 1}: Main image is required`,
          });
        }

        if (!subImageFiles || subImageFiles.length === 0) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: `Variant ${i + 1}: At least one sub image is required`,
          });
        }

        // Multer + Cloudinary already gives the uploaded URL in file.path
        const mainImageUrl = mainImageFile.path;
        const subImagesUrls = subImageFiles.map((file) => file.path);

        // Add validated variant
        variantsToAdd.push({
          volume,
          price,
          stock,
          mainImage: mainImageUrl,
          subImages: subImagesUrls,
        });
      }

      // Save to database
      product.variants.push(...variantsToAdd);
      await product.save();

      res.json({
        success: true,
        message: `${variantsToAdd.length} new variant(s) added successfully`,
        product,
      });
    } catch (err) {
      console.error("Error adding new variants:", err);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
];

export default {
  getaddProductPage,
  addProduct,
  getEditPage,
  editProduct,
  addNewVariants,
};
