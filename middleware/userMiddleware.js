import userModel from "../models/userModel.js"

const checkSession = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            return next(); // If no session, just move forward
        }

        const user = await userModel.findById(req.session.user).select('-password').lean();

        
        if (user && user.blocked) {
    req.session.destroy(() => {});
    return res.redirect('/login?message=Account+blocked');
}

        // Attach user if not blocked
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
        if (req.session.user) {
            return res.redirect('/home');
        }
        next();
    } catch (error) {
        console.error('Login Check Error:', error);
        next();
    }
}

export default { 
    isLogin, 
    checkSession 
}