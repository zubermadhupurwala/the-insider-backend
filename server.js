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

  const amountMatch = rawText.match(
    /(?:₹|rs\.?|inr)?\s*[\d,.]+\s*(?:crore|cr|lakh|lakhs)/i
  );

  if (amountMatch) {
    orderValue = amountMatch[0].trim();
  }

  // NEGATIVE
  if (
    text.includes("cancellation of order") ||
    text.includes("order cancelled") ||
    text.includes("contract terminated") ||
    text.includes("penalty") ||
    text.includes("fine imposed") ||
    text.includes("default") ||
    text.includes("fraud") ||
    text.includes("insolvency") ||
    text.includes("bankruptcy") ||
    text.includes("loss widened") ||
    text.includes("revenue declined") ||
    text.includes("profit declined") ||
    text.includes("downgrade") ||
    text.includes("show cause notice") ||
    text.includes("regulatory action")
  ) {
    category = "NEGATIVE";
    impact = "NEGATIVE";
  }

  // BIG ORDER
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
    text.includes("order received") ||
    text.includes("order win") ||
    text.includes("wins order") ||
    text.includes("major order")
  ) {
    category = "BIG ORDER";
    impact = "POSITIVE";
  }

  // INSIDER / PROMOTER
  else if (
    text.includes("insider trading") ||
    text.includes("promoter acquisition") ||
    text.includes("promoter acquired") ||
    text.includes("acquisition of shares") ||
    text.includes("disposal of shares") ||
    text.includes("promoter transaction") ||
    text.includes("promoter group") ||
    text.includes("pledge of shares") ||
    text.includes("release of pledge")
  ) {
    category = "INSIDER";
    impact = "INSIDER";
  }

  // POSITIVE CORPORATE EVENTS
  else if (
    text.includes("capacity expansion") ||
    text.includes("expansion") ||
    text.includes("strategic partnership") ||
    text.includes("joint venture") ||
    text.includes("agreement signed") ||
    text.includes("approval received") ||
    text.includes("product launch") ||
    text.includes("commercial production") ||
    text.includes("new plant") ||
    text.includes("new facility") ||
    text.includes("acquisition completed") ||
    text.includes("acquisition approved") ||
    text.includes("investment approved") ||
    text.includes("fund raising approved") ||
    text.includes("buyback") ||
    text.includes("bonus issue") ||
    text.includes("dividend") ||
    text.includes("profit increased") ||
    text.includes("profit rises") ||
    text.includes("profit growth") ||
    text.includes("revenue increased") ||
    text.includes("revenue rises") ||
    text.includes("revenue growth") ||
    text.includes("record revenue") ||
    text.includes("record profit")
  ) {
    category = "POSITIVE";
    impact = "POSITIVE";
  }

  // POSSIBLE OPPORTUNITY
  else if (
    text.includes("lowest bidder") ||
    text.includes("l1 bidder") ||
    text.includes("preferred bidder") ||
    text.includes("tender") ||
    text.includes("under discussion") ||
    text.includes("proposed acquisition") ||
    text.includes("proposed expansion") ||
    text.includes("expression of interest") ||
    text.includes("memorandum of understanding") ||
    text.includes("mou signed")
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
}
function formatNseDate(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
}

app.get("/nse-feed", async (req, res) => {
  try {
    const today = new Date();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const fromDate = formatNseDate(sevenDaysAgo);
    const toDate = formatNseDate(today);

    const headers = {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json,text/plain,*/*",
      "Referer": "https://www.nseindia.com/"
    };

    let announcements = [];

    try {
      const response = await axios.get(
        "https://www.nseindia.com/api/corporate-announcements",
        {
          params: {
            index: "equities",
            from_date: fromDate,
            to_date: toDate
          },
          headers
        }
      );

      if (Array.isArray(response.data)) {
        announcements = response.data;
      }
    } catch (dateRangeError) {
      console.log("Date range request failed. Using latest feed.");
    }

    // Fallback to latest announcements
    if (announcements.length === 0) {
      const response = await axios.get(
        "https://www.nseindia.com/api/corporate-announcements?index=equities",
        { headers }
      );

      announcements = response.data;
    }

    const classifiedData = announcements
      .map(classifyAnnouncement)
      .sort((a, b) => {
        const priority = {
          "BIG ORDER": 1,
          "NEGATIVE": 2,
          "POSITIVE": 3,
          "POSSIBLE": 4,
          "INSIDER": 5,
          "GENERAL": 6
        };

        return (
          (priority[a.category] || 10) -
          (priority[b.category] || 10)
        );
      });

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
