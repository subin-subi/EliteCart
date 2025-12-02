import Wallet from "../../models/walletModel.js";
import User from "../../models/userModel.js"; 
import HTTP_STATUS from "../../utils/responseHandler.js";

const getWallet = async (req, res) => {
  try {
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);

    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await Wallet.create({
        user: userId,
        balance: 0,
        transactions: []
      });
    }

    // TOTAL TRANSACTIONS
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit) || 1;

    // SORT FIRST, THEN SLICE
    const sortedTransactions = wallet.transactions.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const paginatedTransactions = sortedTransactions.slice(skip, skip + limit);

    res.render("user/wallet", {
      user,
      walletBalance: wallet.balance,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages
    });

  } catch (error) {
    console.error("Wallet Error:", error);
    res.status(500).send("Server Error");
  }
};


export default ({getWallet});
