import { config } from 'dotenv';

config()

const getAdmin = (req, res) => {
    res.render('admin/login');
}

const postAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res.redirect('/admin/login?error=missing');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.redirect('/admin/login?error=invalid_email');
    }

    // Check credentials
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Store in admin session (separate cookie)
      req.session.isAdmin = true;

      // Optional: store admin email/id
      req.session.adminEmail = email;

      // Save session explicitly to ensure it’s written
      req.session.save((err) => {
        if (err) {
          console.error('Error saving admin session:', err);
          return res.redirect('/admin/login?error=server');
        }
        return res.redirect('/admin/dashboard');
      });

    } else {
      return res.redirect('/admin/login?error=unauthorized');
    }

  } catch (error) {
    console.error('Admin login error:', error);
    return res.redirect('/admin/login?error=server');
  }
};


const adminLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Admin logout error:", err);
    }

    res.clearCookie("adminSessionId"); 
    return res.redirect("/admin/login");
  });
};




export default { getAdmin, postAdmin, adminLogout }
