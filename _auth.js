// Very small gate for the HR dashboard endpoints.
// Not a full auth system - it checks a shared access code against the
// HR_ACCESS_CODE environment variable. Good enough for a small internal
// tool; swap for real auth (Netlify Identity, SSO, etc.) if this grows.

function isAuthorized(event) {
  const expected = process.env.HR_ACCESS_CODE;
  if (!expected) return false;
  const provided = event.headers["x-hr-access-code"] || event.headers["X-HR-Access-Code"];
  return provided === expected;
}

module.exports = { isAuthorized };
