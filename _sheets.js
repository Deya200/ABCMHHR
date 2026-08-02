// Shared Google Sheets client used by all functions.
// Requires three environment variables, set in the Netlify dashboard:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  - the service account's email address
//   GOOGLE_PRIVATE_KEY            - the service account's private key (keep the \n escapes)
//   SHEET_ID                      - the ID from the Google Sheet's URL
//
// See README.md for the full setup walkthrough.

const { google } = require("googleapis");

const SHEET_NAME = "Feedback";
const HEADER_ROW = [
  "ID",
  "Timestamp",
  "Submitted By",
  "Department",
  "Category",
  "Message",
  "Status",
  "HR Notes",
];

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY environment variables."
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

function getSheetId() {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) {
    throw new Error("Missing SHEET_ID environment variable.");
  }
  return sheetId;
}

// Makes sure the sheet has a header row. Cheap no-op after the first call.
async function ensureHeader(sheets) {
  const spreadsheetId = getSheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:H1`,
  });
  const row = res.data.values && res.data.values[0];
  if (!row || row.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER_ROW] },
    });
  }
}

module.exports = { getSheetsClient, getSheetId, ensureHeader, SHEET_NAME, HEADER_ROW };
