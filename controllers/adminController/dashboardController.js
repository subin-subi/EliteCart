

const getDashboard = (req, res) => {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  res.render('admin/dashboard');
};

export default { getDashboard };