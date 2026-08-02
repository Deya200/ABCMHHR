const { getSheetsClient, getSheetId, ensureHeader, SHEET_NAME } = require("./_sheets");
const crypto = require("crypto");

const ALLOWED_CATEGORIES = [
  "Workload & staffing",
  "Management & leadership",
  "Safety & wellbeing",
  "Equipment & facilities",
  "Culture & respect",
  "Pay & scheduling",
  "Systems & processes",
  "Other",
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { anonymous, name, department, category, message } = payload;

  if (!message || !message.trim()) {
    return { statusCode: 400, body: "Message is required." };
  }
  if (!category || !ALLOWED_CATEGORIES.includes(category)) {
    return { statusCode: 400, body: "Valid category is required." };
  }
  if (message.length > 4000) {
    return { statusCode: 400, body: "Message is too long." };
  }

  const submittedBy = anonymous ? "Anonymous" : (name || "").trim() || "Anonymous";

  try {
    const sheets = await getSheetsClient();
    await ensureHeader(sheets);

    const row = [
      crypto.randomUUID(),
      new Date().toISOString(),
      submittedBy,
      (department || "").trim(),
      category,
      message.trim(),
      "New",
      "",
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: getSheetId(),
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Could not save feedback. Please try again." };
  }
};
