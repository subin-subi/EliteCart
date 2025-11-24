import axios from "axios";
import HTTP_STATUS from "../../utils/responseHandler.js";


const getLocationByPinCode = async (req, res) => {
  const pincode = req.query.pincode;

  if (!pincode || pincode.length !== 6) {
    return  res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Invalid Pincode" });
  }

  try {
    const response = await axios.get(
      `https://api.postalpincode.in/pincode/${pincode}`
    );

    const data = response.data;

    if (data[0].Status === "Success") {
      const postOffice = data[0].PostOffice[0];

      return res.json({
        city: postOffice.District,
        state: postOffice.State,
      });
    } else {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: "Pincode not found" });
    }
  } catch (error) {
    console.error("Error", error.message);
     res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Server error" });
  }
};

export default ({getLocationByPinCode});
