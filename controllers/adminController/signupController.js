import { config } from 'dotenv';

config()

const getAdmin = (req, res) => {
    res.render('admin/login');
}

const postAdmin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      
      if (!email || !password) {
        return res.redirect('/admin/login?error=missing');
      }

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
  try {
    
    if (req.session.isAdmin) {
      delete req.session.isAdmin;
    }

    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.redirect('/admin/login');
  } catch (err) {
    console.error('Admin logout error:', err);
    res.status(500).send('Server error during logout');
  }
};


export default { getAdmin, postAdmin, getLogout }
