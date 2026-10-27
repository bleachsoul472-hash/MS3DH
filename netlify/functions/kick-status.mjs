const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export default async (request) => {
  if (request.method !== "GET") return json(405, { success: false, error: "Method not allowed" });
  const url = new URL(request.url);
  const channel = (url.searchParams.get("channel") || process.env.KICK_CHANNEL || "").trim().replace(/^@/, "");
  if (!/^[a-zA-Z0-9_]{1,50}$/.test(channel)) return json(400, { success: false, error: "Invalid channel" });
  try {
    const upstream = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(channel)}/livestream`, {
      headers: { "accept": "application/json", "user-agent": "Mozilla/5.0 (compatible; MS3DH-Website/1.0)" },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return json(502, { success: false, error: "Kick status request failed", upstreamStatus: upstream.status });
    const raw = await upstream.json();
    const stream = raw?.data ?? raw?.livestream ?? raw;
    const isLive = Boolean(stream && (stream.id || stream.session_title || stream.created_at || stream.viewer_count !== undefined) && stream.is_live !== false);
    return json(200, {
      success: true,
      channel,
      offlineImage: process.env.OFFLINE_IMAGE_URL || null,
      isLive,
      title: stream?.session_title || stream?.title || stream?.livestream?.session_title || null,
      viewers: Number.isFinite(Number(stream?.viewer_count)) ? Number(stream.viewer_count) : null,
      thumbnail: stream?.thumbnail?.url || stream?.thumbnail_url || null
    });
  } catch (error) {
    return json(502, { success: false, error: "Unable to reach Kick" });
  }
};
