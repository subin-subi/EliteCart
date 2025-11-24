import Wallet from "../../models/walletModel.js";
import User from "../../models/userModel.js"; 
import HTTP_STATUS from "../../utils/responseHandler.js";

const getWallet = async (req, res) => {
  try {
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit;

  
    const [user, wallet] = await Promise.all([
      User.findById(userId),
      Wallet.findOne({ user: userId }),
    ]);

    
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

   
    const allTransactions = wallet.transactions.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const paginatedTransactions = allTransactions.slice(skip, skip + limit);
    const totalPages = Math.ceil(allTransactions.length / limit);

  
    res.render("user/wallet", {
      user,
      walletBalance: wallet.balance,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error loading wallet:", error);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server error");
  }
};


export default ({getWallet});
