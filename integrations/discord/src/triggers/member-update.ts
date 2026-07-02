import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let memberUpdate = SlateTrigger.create(spec, {
  name: 'Member Update',
  key: 'member_update',
  description:
    'Triggers when guild members change. Detects member joins, leaves, role changes, and nickname changes by polling the guild members list.'
})
  .scopes(discordActionScopes.memberUpdate)
  .input(
    z.object({
      eventType: z
        .enum(['member_joined', 'member_left', 'member_updated'])
        .describe('Type of member event'),
      guildId: z.string().describe('Guild ID where the change occurred'),
      userId: z.string().describe('User ID of the affected member'),
      username: z.string().optional().describe('Username of the member'),
      nickname: z.string().optional().nullable().describe('Server nickname of the member'),
      roles: z
        .array(z.string())
        .optional()
        .describe('List of role IDs assigned to the member'),
      joinedAt: z
        .string()
        .optional()
        .describe('ISO timestamp of when the member joined the guild')
    })
  )
  .output(
    z.object({
      eventType: z
        .enum(['member_joined', 'member_left', 'member_updated'])
        .describe('Type of member event'),
      guildId: z.string().describe('Guild ID where the change occurred'),
      userId: z.string().describe('User ID of the affected member'),
      username: z.string().optional().describe('Username of the member'),
      nickname: z.string().optional().nullable().describe('Server nickname of the member'),
      roles: z
        .array(z.string())
        .optional()
        .describe('List of role IDs assigned to the member'),
      joinedAt: z
        .string()
        .optional()
        .describe('ISO timestamp of when the member joined the guild')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds * 2
    },

    pollEvents: async ctx => {
      let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
      let state = ctx.state as {
        knownMembers?: Record<
          string,
          Record<string, { nickname?: string | null; roles?: string[] }>
        >;
      } | null;
      let knownMembers = state?.knownMembers || {};

      // Fetch guilds the bot/user has access to
      let guilds = await client.listCurrentUserGuilds(100);

      let inputs: Array<{
        eventType: 'member_joined' | 'member_left' | 'member_updated';
        guildId: string;
        userId: string;
        username?: string;
        nickname?: string | null;
        roles?: string[];
        joinedAt?: string;
      }> = [];

      let updatedKnownMembers: Record<
        string,
        Record<string, { nickname?: string | null; roles?: string[] }>
      > = {};

      for (let guild of guilds) {
        try {
          let members = await client.listGuildMembers(guild.id, { limit: 1000 });
          let knownGuildMembers = knownMembers[guild.id] || {};
          let updatedGuildMembers: Record<
            string,
            { nickname?: string | null; roles?: string[] }
          > = {};

          let currentMemberIds = new Set<string>();

          for (let member of members) {
            let userId = member.user?.id;
            if (!userId) continue;

            currentMemberIds.add(userId);
            updatedGuildMembers[userId] = {
              nickname: member.nick || null,
              roles: member.roles || []
            };

            let known = knownGuildMembers[userId];

            if (!known) {
              // Only emit if we already had state (i.e., not first poll)
              if (Object.keys(knownGuildMembers).length > 0) {
                inputs.push({
                  eventType: 'member_joined',
                  guildId: guild.id,
                  userId,
                  username: member.user?.username,
                  nickname: member.nick || null,
                  roles: member.roles,
                  joinedAt: member.joined_at
                });
              }
            } else {
              // Check for role changes
              let rolesChanged =
                JSON.stringify([...(known.roles || [])].sort()) !==
                JSON.stringify([...(member.roles || [])].sort());
              let nicknameChanged = known.nickname !== (member.nick || null);

              if (rolesChanged || nicknameChanged) {
                inputs.push({
                  eventType: 'member_updated',
                  guildId: guild.id,
                  userId,
                  username: member.user?.username,
                  nickname: member.nick || null,
                  roles: member.roles,
                  joinedAt: member.joined_at
                });
              }
            }
          }

          // Detect members who left (only if we had prior state)
          if (Object.keys(knownGuildMembers).length > 0) {
            for (let userId of Object.keys(knownGuildMembers)) {
              if (!currentMemberIds.has(userId)) {
                inputs.push({
                  eventType: 'member_left',
                  guildId: guild.id,
                  userId
                });
              }
            }
          }

          updatedKnownMembers[guild.id] = updatedGuildMembers;
        } catch {
          // Skip guilds we can't read members from
          if (knownMembers[guild.id]) {
            updatedKnownMembers[guild.id] = knownMembers[guild.id]!;
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownMembers: updatedKnownMembers
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `member.${ctx.input.eventType}`,
        id: `member-${ctx.input.guildId}-${ctx.input.userId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          eventType: ctx.input.eventType,
          guildId: ctx.input.guildId,
          userId: ctx.input.userId,
          username: ctx.input.username,
          nickname: ctx.input.nickname,
          roles: ctx.input.roles,
          joinedAt: ctx.input.joinedAt
        }
      };
    }
  })
  .build();
