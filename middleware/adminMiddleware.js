const checkSession = (req, res, next) => {
    if(req.session.isAdmin){
        next()
    } else {
        res.redirect("/admin/login")
    }
}

const isLogin = (req, res, next) => {
    if(req.session.isAdmin){
        res.redirect("/admin/dashboard")
    } else {
        next()
    }
}
function checkBlocked(req, res, next) {
    if (req.session.user && req.session.user.blocked) {
        req.session.destroy(() => {
            res.clearCookie("sessionId");
            return res.redirect("/login?blocked=true");
        });
    } else {
        next();
    }
}


export default { checkSession, isLogin, checkBlocked }