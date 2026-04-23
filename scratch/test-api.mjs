import fetch from "node-fetch";

async function testFetch() {
  console.log("TESTING API SYNC...");
  try {
    const res = await fetch("http://localhost:3000/api/admin/financials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        organizationId: "69ddbdb61ad63caf75aab8ce",
        financials: {
          initialMonthlyCollection: 1060500,
          initialDelayedFine: 0,
          initialServiceCharge: 0,
          initialBankInterest: 0,
          initialLoanInterest: 0,
          initialNav: 0,
          initialMiscellaneous: 0
        }
      })
    });
    
    const data = await res.json();
    console.log("RESPONSE STATUS:", res.status);
    console.log("RESPONSE BODY:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("FETCH ERROR:", err.message);
  }
}

testFetch();
