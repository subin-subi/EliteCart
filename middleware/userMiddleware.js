import userModel from "../models/userModel.js"

const checkSession = async (req, res, next) => {
    try {
        console.log('Checking session:', req.session); // Debugging session data

        if (!req.session || !req.session.user) {
            return res.redirect('/login?message=Session+expired');
        }

        const user = await userModel.findById(req.session.user).select('-password').lean();
        
        if (!user) {
            req.session.destroy(() => {});
            res.clearCookie('sessionId');
            return res.redirect('/login?message=Invalid+session');
        }

        if (user.blocked) {
            req.session.destroy(() => {});
            res.clearCookie('sessionId');
            return res.redirect('/login?message=Account+blocked');
        }

        req.user = user;
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