
const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "access-control-allow-origin": "*",
};

const json = (statusCode, body) =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers,
  });

const splitIds = (value = "") =>
  value.split(",").map((v) => v.trim()).filter(Boolean);

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": "MS3DH-NEXUS/1.0",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Upstream ${response.status}: ${url}`);
  }

  return response.json();
}

async function kickStatus() {
  const slug = (process.env.KICK_CHANNEL_SLUG || "i5vb").trim();

  try {
    const data = await fetchJson(
      `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`,
      { headers: { accept: "application/json" } }
    );

    const stream = data?.livestream ?? data?.data?.livestream ?? null;
    const isLive = Boolean(stream && stream.is_live !== false);

    return {
      channel: slug,
      isLive,
      viewerCount:
        isLive && Number.isFinite(Number(stream?.viewer_count))
          ? Number(stream.viewer_count)
          : null,
      title: stream?.session_title || stream?.title || null,
      category:
        stream?.categories?.[0]?.name ||
        stream?.category?.name ||
        null,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      channel: slug,
      isLive: null,
      viewerCount: null,
      error: "kick_unavailable",
      checkedAt: new Date().toISOString(),
    };
  }
}

async function discordStatus() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !guildId) {
    return {
      configured: false,
      memberCount: null,
      onlineCount: null,
      adminsCount: null,
      moderatorsCount: null,
      message:
        "أضف DISCORD_BOT_TOKEN وDISCORD_GUILD_ID في متغيرات Netlify.",
    };
  }

  const api = "https://discord.com/api/v10";
  const auth = {
    authorization: `Bot ${token}`,
    accept: "application/json",
  };

  try {
    const guild = await fetchJson(
      `${api}/guilds/${encodeURIComponent(guildId)}?with_counts=true`,
      { headers: auth }
    );

    const adminRoleIds = splitIds(process.env.DISCORD_ADMIN_ROLE_IDS);
    const moderatorRoleIds = splitIds(process.env.DISCORD_MOD_ROLE_IDS);

    let admins = null;
    let moderators = null;

    if (adminRoleIds.length || moderatorRoleIds.length) {
      const targetAdmin = new Set(adminRoleIds);
      const targetMods = new Set(moderatorRoleIds);
      const adminMembers = new Set();
      const modMembers = new Set();

      let after = "0";
      let pages = 0;

      while (true) {
        const members = await fetchJson(
          `${api}/guilds/${encodeURIComponent(guildId)}/members?limit=1000&after=${after}`,
          { headers: auth }
        );

        if (!Array.isArray(members)) {
          throw new Error("Invalid member list response");
        }

        for (const member of members) {
          const roles = member.roles || [];

          if (roles.some((role) => targetAdmin.has(role))) {
            adminMembers.add(member.user.id);
          }

          if (roles.some((role) => targetMods.has(role))) {
            modMembers.add(member.user.id);
          }
        }

        pages++;

        if (members.length < 1000) break;

        after = members[members.length - 1].user.id;

        if (pages >= 100) {
          throw new Error("Member scan safety limit reached");
        }
      }

      admins = adminRoleIds.length ? adminMembers.size : null;
      moderators = moderatorRoleIds.length ? modMembers.size : null;
    }

    return {
      configured: true,
      guildName: guild.name || null,
      memberCount: Number.isFinite(guild.approximate_member_count)
        ? guild.approximate_member_count
        : null,
      onlineCount: Number.isFinite(guild.approximate_presence_count)
        ? guild.approximate_presence_count
        : null,
      adminsCount: admins,
      moderatorsCount: moderators,
      message:
        "تُحدّث أعداد Discord تلقائيًا. أضف معرّفات الرتب في متغيرات Netlify لاحتساب الإدارة والمودريترز.",
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      configured: true,
      memberCount: null,
      onlineCount: null,
      adminsCount: null,
      moderatorsCount: null,
      message:
        "تعذر جلب Discord. تحقق من Server ID وصلاحيات البوت وServer Members Intent ومعرّفات الرتب.",
    };
  }
}

let cachedPayload = null;
let cachedAt = 0;

export default async () => {
  try {
    const now = Date.now();

    if (cachedPayload && now - cachedAt < 45_000) {
      return json(200, cachedPayload);
    }

    const [kick, discord] = await Promise.all([
      kickStatus(),
      discordStatus(),
    ]);

    cachedPayload = {
      ok: true,
      kick,
      discord,
      checkedAt: new Date().toISOString(),
    };

    cachedAt = now;

    return new Response(JSON.stringify(cachedPayload), {
      status: 200,
      headers: {
        ...headers,
        "cache-control":
          "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return json(500, {
      ok: false,
      message: "حدث خطأ داخلي أثناء تجهيز بيانات MS3DH.",
    });
  }
};
