// Applications store one text field, and we want a portfolio link too without changing the database.
// So the link rides at the front of the statement as a tag: [PORTFOLIO_URL: https://...]
const TAG = /^\[PORTFOLIO_URL:\s*([^\]\s]+)\]\s*/;

/** True for a plain http(s) URL with no spaces or brackets. */
export function isValidPortfolioUrl(value) {
  if (!/^https?:\/\/\S+$/i.test(value) || /[\[\]]/.test(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Build the text we send to the backend. */
export function buildStatement(url, text) {
  const clean = (text || "").trim();
  const link = (url || "").trim();
  if (!link) return clean;
  return clean ? `[PORTFOLIO_URL: ${link}]\n\n${clean}` : `[PORTFOLIO_URL: ${link}]`;
}

/** Split a stored statement into { portfolioUrl, text }. Only http(s) links are ever returned. */
export function parseApplicationStatement(raw) {
  const source = raw || "";
  const m = source.match(TAG);
  if (!m) return { portfolioUrl: null, text: source.trim() };
  const portfolioUrl = isValidPortfolioUrl(m[1]) ? m[1] : null;
  return { portfolioUrl, text: source.slice(m[0].length).trim() };
}
