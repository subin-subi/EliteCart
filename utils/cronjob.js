import cron from "node-cron";
import Offer from "../models/offerModel.js";
import Coupon from "../models/couponModel.js";

 export default function startOfferCron() {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    try {
      // Activate offers within window
      await Offer.updateMany({ startAt: { $lte: now }, endAt: { $gte: now },isNonBlocked:true }, { $set: { isActive: true } });
      // Deactivate offers past end
      await Offer.updateMany({ endAt: { $lt: now } }, { $set: { isActive: false } });
      // Deactivate offers not yet started
      await Offer.updateMany({ startAt: { $gt: now } }, { $set: { isActive: false } });

            // Activate coupons within window
      await Coupon.updateMany({ startAt: { $lte: now }, endAt: { $gte: now }, isNonBlocked: true }, { $set: { isActive: true } });
      // Deactivate coupons past end
      await Coupon.updateMany({ endAt: { $lt: now } }, { $set: { isActive: false } });
      // Deactivate coupons not yet started
      await Coupon.updateMany({ startAt: { $gt: now } }, { $set: { isActive: false } });
    } catch (err) {
      console.error("Offer cron error:", err);
    }
  });
}

