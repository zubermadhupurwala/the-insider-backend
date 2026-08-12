const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("The Insider Backend is Running");
});

function classifyAnnouncement(item) {
  const text = `${item.desc || ""} ${item.attchmntText || ""}`.toLowerCase();

  let category = "GENERAL";
  let impact = "NEUTRAL";

  if (
    text.includes("order") ||
    text.includes("contract") ||
    text.includes("purchase order") ||
    text.includes("letter of award") ||
    text.includes("work order")
  ) {
    category = "BIG ORDER";
    impact = "POSITIVE";
  } else if (
    text.includes("insider") ||
    text.includes("promoter") ||
    text.includes("acquisition of shares") ||
    text.includes("disposal of shares")
  ) {
    category = "INSIDER";
    impact = "INSIDER";
  } else if (
    text.includes("penalty") ||
    text.includes("fine") ||
    text.includes("default") ||
    text.includes("fraud") ||
    text.includes("resignation") ||
    text.includes("loss")
  ) {
    category = "NEGATIVE";
    impact = "NEGATIVE";
  } else if (
    text.includes("approval") ||
    text.includes("award") ||
    text.includes("agreement") ||
    text.includes("partnership") ||
    text.includes("expansion") ||
    text.includes("launch")
  ) {
    category = "POSITIVE";
    impact = "POSITIVE";
  }

  return {
    ...item,
    category,
    impact
  };
}

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

    const classifiedData = response.data.map(classifyAnnouncement);

    res.json(classifiedData);
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
