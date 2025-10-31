import Wallet from "../../models/walletModel.js";
import User from "../../models/userModel.js"; // add this import

const getWallet = async (req, res) => {
  try {
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1; // current page number
    const limit = 5; // transactions per page
    const skip = (page - 1) * limit;

    // Fetch user and wallet
    const [user, wallet] = await Promise.all([
      User.findById(userId),
      Wallet.findOne({ user: userId }),
    ]);

    // If wallet doesn't exist, create one
    if (!wallet) {
      const newWallet = await Wallet.create({ user: userId, balance: 0 });
      return res.render("user/wallet", {
        user,
        walletBalance: newWallet.balance,
        transactions: [],
        currentPage: 1,
        totalPages: 1,
      });
    }

    // Sort transactions by date (latest first)
    const allTransactions = wallet.transactions.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const paginatedTransactions = allTransactions.slice(skip, skip + limit);
    const totalPages = Math.ceil(allTransactions.length / limit);

    // Render wallet page
    res.render("user/wallet", {
      user,
      walletBalance: wallet.balance,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error loading wallet:", error);
    res.status(500).send("Server error");
  }
};


export default ({getWallet});
