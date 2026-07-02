import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let guildOutputSchema = z.object({
  guildId: z.string().describe('Guild (server) ID'),
  name: z.string().describe('Guild name'),
  description: z.string().nullable().optional().describe('Guild description'),
  ownerId: z.string().optional().describe('User ID of the guild owner'),
  memberCount: z.number().optional().describe('Approximate member count (when available)'),
  icon: z.string().nullable().optional().describe('Guild icon hash')
});

export let manageGuild = SlateTool.create(spec, {
  name: 'Manage Guild',
  key: 'manage_guild',
  description: `Get information about a Discord guild (server), list the current user's guilds, or update guild settings such as name, description, verification level, and notification preferences.`,
  instructions: [
    'To **get** guild details, set action to "get" and provide the guildId.',
    'To **list** guilds the current user belongs to, set action to "list". Optionally use limit, before, and after for pagination.',
    'To **update** guild settings, set action to "update" and provide the guildId plus the fields to change (name, description, verificationLevel, defaultMessageNotifications, afkChannelId, afkTimeout, systemChannelId).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageGuild)
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'update'])
        .describe('The guild management action to perform'),
      guildId: z
        .string()
        .optional()
        .describe('Guild ID (required for get and update actions)'),
      withCounts: z
        .boolean()
        .optional()
        .describe('Include approximate member and presence counts (for get action)'),
      limit: z
        .number()
        .optional()
        .describe('Max number of guilds to return, 1-200 (for list action)'),
      before: z
        .string()
        .optional()
        .describe('Get guilds before this guild ID (for list action pagination)'),
      after: z
        .string()
        .optional()
        .describe('Get guilds after this guild ID (for list action pagination)'),
      name: z.string().optional().describe('New guild name (for update action)'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('New guild description (for update action)'),
      verificationLevel: z
        .number()
        .optional()
        .describe(
          'Verification level: 0=None, 1=Low, 2=Medium, 3=High, 4=Very High (for update action)'
        ),
      defaultMessageNotifications: z
        .number()
        .optional()
        .describe(
          'Default notification level: 0=All Messages, 1=Only Mentions (for update action)'
        ),
      afkChannelId: z
        .string()
        .nullable()
        .optional()
        .describe('AFK voice channel ID, or null to remove (for update action)'),
      afkTimeout: z.number().optional().describe('AFK timeout in seconds (for update action)'),
      systemChannelId: z
        .string()
        .nullable()
        .optional()
        .describe(
          'System channel ID for join/boost messages, or null to remove (for update action)'
        )
    })
  )
  .output(
    z.object({
      guild: guildOutputSchema
        .optional()
        .describe('Single guild details (for get and update actions)'),
      guilds: z
        .array(guildOutputSchema)
        .optional()
        .describe('List of guilds (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action, guildId } = ctx.input;

    if (action === 'get') {
      if (!guildId) throw discordServiceError('guildId is required for the get action');

      let guild = await client.getGuild(guildId, ctx.input.withCounts);

      return {
        output: {
          guild: {
            guildId: guild.id,
            name: guild.name,
            description: guild.description ?? null,
            ownerId: guild.owner_id,
            memberCount: guild.approximate_member_count,
            icon: guild.icon ?? null
          }
        },
        message: `Retrieved guild **${guild.name}** (\`${guild.id}\`)${guild.approximate_member_count ? ` with ~${guild.approximate_member_count} members` : ''}.`
      };
    }

    if (action === 'list') {
      let results = await client.listCurrentUserGuilds(
        ctx.input.limit,
        ctx.input.before,
        ctx.input.after
      );

      let guilds = results.map((g: any) => ({
        guildId: g.id,
        name: g.name,
        description: g.description ?? null,
        ownerId: g.owner_id,
        memberCount: g.approximate_member_count,
        icon: g.icon ?? null
      }));

      return {
        output: {
          guilds
        },
        message: `Found **${guilds.length}** guild(s): ${guilds.map((g: any) => `${g.name} (\`${g.guildId}\`)`).join(', ')}.`
      };
    }

    // action === 'update'
    if (!guildId) throw discordServiceError('guildId is required for the update action');

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
    if (ctx.input.verificationLevel !== undefined)
      updateData.verification_level = ctx.input.verificationLevel;
    if (ctx.input.defaultMessageNotifications !== undefined)
      updateData.default_message_notifications = ctx.input.defaultMessageNotifications;
    if (ctx.input.afkChannelId !== undefined)
      updateData.afk_channel_id = ctx.input.afkChannelId;
    if (ctx.input.afkTimeout !== undefined) updateData.afk_timeout = ctx.input.afkTimeout;
    if (ctx.input.systemChannelId !== undefined)
      updateData.system_channel_id = ctx.input.systemChannelId;

    let updated = await client.modifyGuild(guildId, updateData);

    return {
      output: {
        guild: {
          guildId: updated.id,
          name: updated.name,
          description: updated.description ?? null,
          ownerId: updated.owner_id,
          memberCount: updated.approximate_member_count,
          icon: updated.icon ?? null
        }
      },
      message: `Updated guild **${updated.name}** (\`${updated.id}\`).`
    };
  })
  .build();
