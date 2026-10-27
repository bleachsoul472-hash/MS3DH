const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });
const env = (name) => (process.env[name] || "").trim();
async function supabaseRequest(path, options = {}) {
  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
}
export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...headers, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type, x-admin-key" } });
  if (request.method === "GET") {
    try {
      const r = await supabaseRequest("site_content?id=eq.1&select=content&limit=1");
      if (!r.ok) return reply(502, { success: false, error: "Could not read shared site content" });
      const rows = await r.json();
      return reply(200, { success: true, content: rows[0]?.content || null });
    } catch (e) { return reply(503, { success: false, error: "Shared content database is not configured" }); }
  }
  if (request.method !== "POST") return reply(405, { success: false, error: "Method not allowed" });
  const configuredKey = env("SITE_ADMIN_KEY");
  const suppliedKey = request.headers.get("x-admin-key") || "";
  if (!configuredKey) return reply(503, { success: false, error: "SITE_ADMIN_KEY is not configured in Netlify" });
  if (suppliedKey.length !== configuredKey.length || suppliedKey !== configuredKey) return reply(401, { success: false, error: "Invalid admin key" });
  let body;
  try { body = await request.json(); } catch { return reply(400, { success: false, error: "Invalid JSON" }); }
  if (body?.action === "auth") return reply(200, { success: true });
  if (body?.action !== "save" || !body.content || typeof body.content !== "object") return reply(400, { success: false, error: "Invalid content payload" });
  const content = body.content;
  if (JSON.stringify(content).length > 900000) return reply(413, { success: false, error: "Content is too large; use public image URLs for large images" });
  try {
    const r = await supabaseRequest("site_content?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: 1, content, updated_at: new Date().toISOString() }) });
    if (!r.ok) return reply(502, { success: false, error: "Supabase save failed. Check table and permissions." });
    return reply(200, { success: true });
  } catch (e) { return reply(503, { success: false, error: "Shared content database is not configured" }); }
};
