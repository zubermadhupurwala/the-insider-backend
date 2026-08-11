const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("The Insider Backend is Running");
});

app.get("/nse-feed", async (req, res) => {
  try {
    const response = await axios.get(
      "https://www.nseindia.com/api/corporate-announcements?index=equities",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json,text/plain,*/*",
          "Referer": "https://www.nseindia.com/"
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Unable to fetch NSE data",
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`The Insider server running on port ${PORT}`);
});
