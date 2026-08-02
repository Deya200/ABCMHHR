const { getSheetsClient, getSheetId, ensureHeader, SHEET_NAME } = require("./_sheets");
const { isAuthorized } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }
  if (!isAuthorized(event)) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  try {
    const sheets = await getSheetsClient();
    await ensureHeader(sheets);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSheetId(),
      range: `${SHEET_NAME}!A2:H`,
    });

    const rows = res.data.values || [];
    const items = rows
      .filter((r) => r[0]) // skip blank rows
      .map((r) => ({
        id: r[0] || "",
        timestamp: r[1] || "",
        submittedBy: r[2] || "",
        department: r[3] || "",
        category: r[4] || "",
        message: r[5] || "",
        status: r[6] || "New",
        hrNotes: r[7] || "",
      }))
      .reverse(); // newest first

    return {
      statusCode: 200,
      body: JSON.stringify({ items }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Could not load feedback." };
  }
};
