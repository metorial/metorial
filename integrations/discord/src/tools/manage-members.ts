import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let formatMember = (member: any) => ({
  userId: member.user?.id ?? null,
  username: member.user?.username ?? null,
  nickname: member.nick ?? null,
  roles: member.roles ?? [],
  joinedAt: member.joined_at ?? null,
  timeoutUntil: member.communication_disabled_until ?? null
});

// Discord defaults list/search to 1 member; this tool documents and applies 100.
// https://docs.discord.com/developers/resources/guild#list-guild-members
let DEFAULT_MEMBER_LIMIT = 100;

export let manageMembers = SlateTool.create(spec, {
  name: 'Manage Members',
  key: 'manage_members',
  description: `List, get, search, update, kick, ban, or unban members in a Discord guild. Supports modifying nicknames, roles, mute and deafen states, and timeouts.`,
  instructions: [
    'Listing members requires the Server Members privileged intent for the bot. Page with after set to the highest userId from the previous page.',
    'Set timeoutUntil to an ISO 8601 time up to 28 days ahead to time a member out, or null to remove the timeout (requires Moderate Members).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageMembers)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'search', 'update', 'kick', 'ban', 'unban'])
        .describe('The member management action to perform'),
      guildId: z.string().describe('The guild (server) ID'),
      userId: z
        .string()
        .optional()
        .describe('The user ID (required for get, update, kick, ban, unban)'),
      query: z.string().optional().describe('Search query string (required for search)'),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum number of members to return (for list and search, default 100, max 1000)'
        ),
      after: z
        .string()
        .optional()
        .describe('Pagination: fetch members after this user ID (for list)'),
      nickname: z
        .string()
        .optional()
        .describe('New nickname for the member (for update; empty string to reset)'),
      roles: z
        .array(z.string())
        .optional()
        .describe(
          'Array of role IDs to assign to the member (for update; replaces all roles)'
        ),
      mute: z.boolean().optional().describe('Whether to server-mute the member (for update)'),
      deafen: z
        .boolean()
        .optional()
        .describe('Whether to server-deafen the member (for update)'),
      timeoutUntil: z
        .string()
        .nullable()
        .optional()
        .describe(
          'ISO 8601 time until which the member is timed out, at most 28 days ahead; null removes the timeout (for update)'
        ),
      deleteMessageSeconds: z
        .number()
        .optional()
        .describe('Number of seconds of messages to delete when banning (0-604800, for ban)')
    })
  )
  .output(
    z.object({
      member: z
        .object({
          userId: z.string().nullable().describe('The user ID'),
          username: z.string().nullable().describe('The username'),
          nickname: z.string().nullable().describe('The guild-specific nickname'),
          roles: z.array(z.string()).describe('Array of role IDs assigned to the member'),
          joinedAt: z
            .string()
            .nullable()
            .describe('ISO 8601 timestamp of when the member joined the guild'),
          timeoutUntil: z
            .string()
            .nullable()
            .optional()
            .describe('ISO 8601 time the member timeout ends, or null when not timed out')
        })
        .optional()
        .describe('Member details (for get and update)'),
      members: z
        .array(
          z.object({
            userId: z.string().nullable().describe('The user ID'),
            username: z.string().nullable().describe('The username'),
            nickname: z.string().nullable().describe('The guild-specific nickname'),
            roles: z.array(z.string()).describe('Array of role IDs assigned to the member'),
            joinedAt: z
              .string()
              .nullable()
              .describe('ISO 8601 timestamp of when the member joined the guild'),
            timeoutUntil: z
              .string()
              .nullable()
              .optional()
              .describe('ISO 8601 time the member timeout ends, or null when not timed out')
          })
        )
        .optional()
        .describe('Array of members (for list and search)'),
      actionPerformed: z.string().describe('Description of the action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action, guildId, userId } = ctx.input;

    if (action === 'list') {
      let members = await client.listGuildMembers(guildId, {
        limit: ctx.input.limit ?? DEFAULT_MEMBER_LIMIT,
        after: ctx.input.after
      });
      let mapped = members.map(formatMember);
      return {
        output: {
          members: mapped,
          actionPerformed: `Listed ${mapped.length} member(s)`
        },
        message: `Listed **${mapped.length}** member(s) in guild \`${guildId}\`.`
      };
    }

    if (action === 'get') {
      if (!userId) throw discordServiceError('userId is required for get action');
      let member = await client.getGuildMember(guildId, userId);
      return {
        output: {
          member: formatMember(member),
          actionPerformed: 'Retrieved member details'
        },
        message: `Retrieved details for member \`${userId}\` in guild \`${guildId}\`.`
      };
    }

    if (action === 'search') {
      if (!ctx.input.query) throw discordServiceError('query is required for search action');
      let members = await client.searchGuildMembers(
        guildId,
        ctx.input.query,
        ctx.input.limit ?? DEFAULT_MEMBER_LIMIT
      );
      let mapped = members.map(formatMember);
      return {
        output: {
          members: mapped,
          actionPerformed: `Found ${mapped.length} member(s) matching "${ctx.input.query}"`
        },
        message: `Found **${mapped.length}** member(s) matching "${ctx.input.query}" in guild \`${guildId}\`.`
      };
    }

    if (action === 'update') {
      if (!userId) throw discordServiceError('userId is required for update action');
      let data: Record<string, any> = {};
      if (ctx.input.nickname !== undefined) data.nick = ctx.input.nickname;
      if (ctx.input.roles !== undefined) data.roles = ctx.input.roles;
      if (ctx.input.mute !== undefined) data.mute = ctx.input.mute;
      if (ctx.input.deafen !== undefined) data.deaf = ctx.input.deafen;
      if (ctx.input.timeoutUntil !== undefined) {
        data.communication_disabled_until = ctx.input.timeoutUntil;
      }
      let member = await client.modifyGuildMember(guildId, userId, data);
      return {
        output: {
          member: formatMember(member),
          actionPerformed: 'Updated member'
        },
        message: `Updated member \`${userId}\` in guild \`${guildId}\`.`
      };
    }

    if (action === 'kick') {
      if (!userId) throw discordServiceError('userId is required for kick action');
      await client.removeGuildMember(guildId, userId);
      return {
        output: {
          actionPerformed: 'Kicked member'
        },
        message: `Kicked member \`${userId}\` from guild \`${guildId}\`.`
      };
    }

    if (action === 'ban') {
      if (!userId) throw discordServiceError('userId is required for ban action');
      await client.createGuildBan(guildId, userId, ctx.input.deleteMessageSeconds);
      return {
        output: {
          actionPerformed: 'Banned member'
        },
        message: `Banned member \`${userId}\` from guild \`${guildId}\`.`
      };
    }

    if (action === 'unban') {
      if (!userId) throw discordServiceError('userId is required for unban action');
      await client.removeGuildBan(guildId, userId);
      return {
        output: {
          actionPerformed: 'Unbanned member'
        },
        message: `Unbanned user \`${userId}\` from guild \`${guildId}\`.`
      };
    }

    throw discordServiceError(`Unknown action: ${action}`);
  })
  .build();
