const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("The Insider Backend is Running");
});

function classifyAnnouncement(item) {
  const rawText = `${item.desc || ""} ${item.attchmntText || ""}`;
  const text = rawText.toLowerCase();

  let category = "GENERAL";
  let impact = "NEUTRAL";
  let orderValue = "";

  // Try to find amount like ₹850 crore, Rs 120 Cr, INR 50 crore
  const amountMatch = rawText.match(
    /(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:crore|cr|lakh|lakhs)/i
  );

  if (amountMatch) {
    orderValue = amountMatch[0].trim();
  }

  // Negative events first
  if (
    text.includes("cancellation of order") ||
    text.includes("order cancelled") ||
    text.includes("contract terminated") ||
    text.includes("penalty") ||
    text.includes("fine imposed") ||
    text.includes("default") ||
    text.includes("fraud") ||
    text.includes("insolvency") ||
    text.includes("bankruptcy")
  ) {
    category = "NEGATIVE";
    impact = "NEGATIVE";
  }

  // Big orders / contracts
  else if (
    text.includes("received an order") ||
    text.includes("receives an order") ||
    text.includes("secured an order") ||
    text.includes("secures an order") ||
    text.includes("bagged an order") ||
    text.includes("bagging of order") ||
    text.includes("purchase order") ||
    text.includes("work order") ||
    text.includes("letter of award") ||
    text.includes("letter of intent") ||
    text.includes("contract awarded") ||
    text.includes("awarded a contract") ||
    text.includes("new contract") ||
    text.includes("order received")
  ) {
    category = "BIG ORDER";
    impact = "POSITIVE";
  }

  // Insider / promoter activity
  else if (
    text.includes("insider trading") ||
    text.includes("promoter acquisition") ||
    text.includes("promoter acquired") ||
    text.includes("acquisition of shares") ||
    text.includes("disposal of shares") ||
    text.includes("promoter transaction")
  ) {
    category = "INSIDER";
    impact = "INSIDER";
  }

  // Other positive developments
  else if (
    text.includes("capacity expansion") ||
    text.includes("expansion") ||
    text.includes("strategic partnership") ||
    text.includes("joint venture") ||
    text.includes("agreement signed") ||
    text.includes("approval received") ||
    text.includes("product launch") ||
    text.includes("commercial production")
  ) {
    category = "POSITIVE";
    impact = "POSITIVE";
  }

  // Possible future opportunity
  else if (
    text.includes("lowest bidder") ||
    text.includes("l1 bidder") ||
    text.includes("preferred bidder") ||
    text.includes("tender") ||
    text.includes("under discussion") ||
    text.includes("proposed acquisition")
  ) {
    category = "POSSIBLE";
    impact = "POSSIBLE";
  }

  return {
    ...item,
    category,
    impact,
    orderValue
  };
}app.get("/nse-feed", async (req, res) => {
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
