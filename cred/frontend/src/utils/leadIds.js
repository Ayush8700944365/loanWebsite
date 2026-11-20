/** Short, consistent display ID. Keep the full leadCode for API calls and storage. */
export const formatLeadUid = (value) => {
  const compact = String(value || "").trim().toUpperCase().replace(/^RC-LD-/, "").replace(/[^A-Z0-9]/g, "");
  return `RC-LD-${compact.length > 6 ? compact.slice(-6) : compact || "NEW"}`;
};
