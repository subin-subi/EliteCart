import { config } from 'dotenv';

config()

const getAdmin = (req, res) => {
    res.render('admin/login');
}

const postAdmin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Input validation
      if (!email || !password) {
        return res.redirect('/admin/login?error=missing');
      }
  
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.redirect('/admin/login?error=invalid_email');
      }
  
      // Check credentials
      if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.redirect('/admin/dashboard');
      } else {
        return res.redirect('/admin/login?error=unauthorized');
      }
  
    } catch (error) {
      console.error('Admin login error:', error);
      return res.redirect('/admin/login?error=server');
    }
  };
  
const getLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).send("Logout failed. Please try again.");
        }
        res.redirect('/admin/login');
    });
};


export default { getAdmin, postAdmin, getLogout }
