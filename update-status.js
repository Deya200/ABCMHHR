const { getSheetsClient, getSheetId, SHEET_NAME } = require("./_sheets");
const { isAuthorized } = require("./_auth");

const ALLOWED_STATUSES = ["New", "In Review", "Resolved"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  if (!isAuthorized(event)) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { id, status, hrNotes } = payload;
  if (!id) return { statusCode: 400, body: "id is required." };
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return { statusCode: 400, body: "Invalid status." };
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSheetId();

    // Find the row with this ID (column A).
    const idsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A2:A`,
    });
    const ids = (idsRes.data.values || []).map((r) => r[0]);
    const rowIndex = ids.indexOf(id);
    if (rowIndex === -1) {
      return { statusCode: 404, body: "Feedback not found." };
    }
    const sheetRow = rowIndex + 2; // +1 for header, +1 for 1-indexing

    const updates = [];
    if (status) {
      updates.push(
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAME}!G${sheetRow}`,
          valueInputOption: "RAW",
          requestBody: { values: [[status]] },
        })
      );
    }
    if (typeof hrNotes === "string") {
      updates.push(
        sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAME}!H${sheetRow}`,
          valueInputOption: "RAW",
          requestBody: { values: [[hrNotes]] },
        })
      );
    }
    await Promise.all(updates);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Could not update feedback." };
  }
};
