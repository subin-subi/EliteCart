import axios from "axios";


const getLocationByPinCode = async (req, res) => {
  const pincode = req.query.pincode;

  if (!pincode || pincode.length !== 6) {
    return res.status(400).json({ error: "Invalid Pincode" });
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
      return res.status(404).json({ error: "Pincode not found" });
    }
  } catch (error) {
    console.error("Error", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

export default ({getLocationByPinCode});
