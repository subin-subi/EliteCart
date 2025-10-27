import userModel from "../models/userModel.js"
import Product from "../models/productModel.js";

const checkBlocked = async (req, res, next) => {
    try {
        const productId = req.params.id;

        if (productId) {
           
            const product = await Product.findById(productId)
                .populate("category")
                .populate("brand");

            if (!product) return res.redirect("/");

            if (product.isBlocked) return res.redirect("/");

            const variantBlocked = product.variants.some(variant => variant.isBlocked);
            if (variantBlocked) return res.redirect("/");

           
            const categoryBlocked = product.category && (!product.category.isActive || product.category.isHidden);
            if (categoryBlocked) return res.redirect("/");

            
            const brandBlocked = product.brand && (!product.brand.isActive || product.brand.isHidden);
            if (brandBlocked) return res.redirect("/");
        }

        next();
    } catch (error) {
        console.error("Error checking blocked status:", error);
        return res.redirect("/"); 
    }
};





const checkSession = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            
            return next(); 
        }

        const user = await userModel.findById(req.session.user).select('-password').lean();

        
        if (user && user.blocked) {
    req.session.destroy(() => {});
    return res.redirect('/login?message=Account+blocked');
}

        if (user) {
            req.user = user;
        }

        next();
    } catch (error) {
        console.error('Session Check Error:', error);
        return res.redirect('/login?message=Server+error');
    }
};

    const isLogin = async (req, res, next) => {
        try {
            if (!req.session.user) {
                return res.redirect('/signup');
            }
            next();
        } catch (error) {
            console.error('Login Check Error:', error);
            next();
        }
    }


const noCache = (req, res, next) => {
  res.header("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1
  res.header("Pragma", "no-cache"); // HTTP 1.0
  res.header("Expires", "0"); // Proxies
  next();
};

const requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login?message=Please+login+first");
  }
  next();
};

export default { 
    isLogin, 
    checkSession ,
    noCache,
    requireLogin,
    checkBlocked
}