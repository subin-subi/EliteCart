import Wallet from "../../models/walletModel.js";
import User from "../../models/userModel.js"; // add this import

const getWallet = async (req, res) => {
  try {
    const userId = req.session.user;

    // Fetch user and wallet
    const [user, wallet] = await Promise.all([
      User.findById(userId),
      Wallet.findOne({ user: userId }),
    ]);

    // Create wallet if not found
    if (!wallet) {
      const newWallet = await Wallet.create({ user: userId, balance: 0 });
      return res.render("user/wallet", {
        user,
        walletBalance: newWallet.balance,
        transactions: [],
      });
    }

    // Render wallet page with all data
    res.render("user/wallet", {
      user,
      walletBalance: wallet.balance,
      transactions: wallet.transactions || [],
    });
  } catch (error) {
    console.error("Error loading wallet:", error);
    res.status(500).send("Server error");
  }
};

export default ({getWallet});
