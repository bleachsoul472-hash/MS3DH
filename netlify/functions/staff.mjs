
const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });

const splitIds = (value = "") =>
  value.split(",").map((id) => id.trim()).filter(Boolean);

export default async () => {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;

  const adminRoleIds = splitIds(
    process.env.DISCORD_ADMIN_ROLE_IDS
  );

  const modRoleIds = splitIds(
    process.env.DISCORD_MOD_ROLE_IDS
  );

  if (!token || !guildId) {
    return json({
      success: false,
      error: "Missing Discord environment variables",
      staff: [],
    }, 500);
  }

  const base = "https://discord.com/api/v10";
  const headersDiscord = {
    Authorization: `Bot ${token}`,
  };

  try {
    const [rolesResponse, membersResponse] = await Promise.all([
      fetch(`${base}/guilds/${guildId}/roles`, {
        headers: headersDiscord,
      }),
      fetch(
        `${base}/guilds/${guildId}/members?limit=1000`,
        { headers: headersDiscord }
      ),
    ]);

    if (!rolesResponse.ok || !membersResponse.ok) {
      return json({
        success: false,
        error: "Discord API request failed",
        staff: [],
      }, 502);
    }

    const [roles, members] = await Promise.all([
      rolesResponse.json(),
      membersResponse.json(),
    ]);

    const roleNames = new Map(
      roles.map((role) => [role.id, role.name])
    );

    const staff = members
      .map((member) => {
        const user = member.user;
        const memberRoleIds = member.roles || [];

        const adminRoles = memberRoleIds.filter(
          (id) => adminRoleIds.includes(id)
        );

        const modRoles = memberRoleIds.filter(
          (id) => modRoleIds.includes(id)
        );

        if (!adminRoles.length && !modRoles.length) {
          return null;
        }

        const selectedRoles = [
          ...new Set([...adminRoles, ...modRoles]),
        ];

        return {
          id: user.id,
          name:
            user.global_name ||
            user.username ||
            "Discord Member",
          username: user.username,
          avatar: user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
            : null,
          category: adminRoles.length ? "admin" : "moderator",
          roles: selectedRoles.map(
            (id) => roleNames.get(id) || id
          ),
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.category === b.category
          ? a.name.localeCompare(b.name)
          : a.category === "admin" ? -1 : 1
      );

    return json({
      success: true,
      serverId: guildId,
      total: staff.length,
      staff,
    });
  } catch {
    return json({
      success: false,
      error: "Failed to fetch Discord staff",
      staff: [],
    }, 500);
  }
};
        
