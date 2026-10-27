const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const clean = (value, max) => String(value ?? "").trim().slice(0, max);

export default async (request) => {
  if (request.method !== "POST") return json(405, { success: false, error: "Method not allowed" });
  const webhook = process.env.DISCORD_SUPPORT_WEBHOOK_URL;
  if (!webhook || !/^https:\/\/discord(?:app)?\.com\/api\/webhooks\//i.test(webhook)) {
    return json(503, { success: false, error: "Support destination is not configured" });
  }
  let body;
  try { body = await request.json(); } catch { return json(400, { success: false, error: "Invalid JSON" }); }
  const discordName = clean(body.discordName, 80);
  const discordId = clean(body.discordId, 30);
  const requestType = clean(body.requestType, 30);
  const requestTitle = clean(body.requestTitle, 120);
  const requestMessage = clean(body.requestMessage, 1800);
  if (!discordName || !requestTitle || !requestMessage || !["استفسار", "شكوى", "اقتراح"].includes(requestType)) {
    return json(400, { success: false, error: "Please complete all required fields" });
  }
  const embed = {
    title: `طلب دعم جديد: ${requestType}`,
    color: requestType === "شكوى" ? 15158332 : requestType === "اقتراح" ? 3447003 : 15105570,
    fields: [
      { name: "عنوان الطلب", value: requestTitle, inline: false },
      { name: "اسم ديسكورد", value: discordName, inline: true },
      { name: "معرّف ديسكورد", value: discordId || "لم يُذكر", inline: true },
      { name: "التفاصيل", value: requestMessage, inline: false }
    ],
    footer: { text: "MS3DH Support Center" },
    timestamp: new Date().toISOString()
  };
  try {
    const result = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "MS3DH Support", embeds: [embed], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000)
    });
    if (!result.ok) return json(502, { success: false, error: "Discord rejected the support request" });
    return json(200, { success: true });
  } catch {
    return json(502, { success: false, error: "Unable to deliver request to Discord" });
  }
};
