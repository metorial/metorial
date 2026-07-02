import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let trackedFields = [
  'name',
  'icon',
  'description',
  'owner_id',
  'verification_level',
  'default_message_notifications',
  'explicit_content_filter',
  'afk_channel_id',
  'afk_timeout',
  'system_channel_id',
  'rules_channel_id',
  'public_updates_channel_id',
  'preferred_locale',
  'premium_tier',
  'nsfw_level',
  'vanity_url_code',
  'banner',
  'splash'
] as const;

type GuildSnapshot = Record<string, any>;

export let guildUpdate = SlateTrigger.create(spec, {
  name: 'Guild Update',
  key: 'guild_update',
  description:
    'Triggers when a guild (server) setting changes, such as name, description, icon, verification level, owner, or other server-level properties. Polls guilds to detect changes.'
})
  .scopes(discordActionScopes.guildUpdate)
  .input(
    z.object({
      guildId: z.string().describe('Guild ID'),
      guildName: z.string().describe('Guild name'),
      changeType: z
        .string()
        .describe('The field that changed (e.g. name, icon, description, verification_level)'),
      previousValue: z.string().optional().describe('Previous value of the changed field'),
      newValue: z.string().optional().describe('New value of the changed field')
    })
  )
  .output(
    z.object({
      guildId: z.string().describe('Guild ID'),
      guildName: z.string().describe('Guild name'),
      changeType: z.string().describe('The field that changed'),
      previousValue: z.string().optional().describe('Previous value of the changed field'),
      newValue: z.string().optional().describe('New value of the changed field'),
      ownerId: z.string().optional().describe('Current owner user ID'),
      icon: z.string().optional().describe('Current guild icon hash'),
      verificationLevel: z.number().optional().describe('Current verification level'),
      memberCount: z.number().optional().describe('Approximate member count')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds * 2
    },

    pollEvents: async ctx => {
      let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
      let state = ctx.state as { knownGuilds?: Record<string, GuildSnapshot> } | null;
      let knownGuilds = state?.knownGuilds || {};

      let guilds = await client.listCurrentUserGuilds(200);

      let inputs: Array<{
        guildId: string;
        guildName: string;
        changeType: string;
        previousValue?: string;
        newValue?: string;
      }> = [];

      let updatedKnownGuilds: Record<string, GuildSnapshot> = {};

      for (let guild of guilds) {
        let fullGuild: any;
        try {
          fullGuild = await client.getGuild(guild.id, true);
        } catch {
          // Bot may not have access to fetch full guild details; skip
          continue;
        }

        let snapshot: GuildSnapshot = {};
        for (let field of trackedFields) {
          snapshot[field] = fullGuild[field] ?? null;
        }

        updatedKnownGuilds[guild.id] = snapshot;

        let known = knownGuilds[guild.id];

        if (!known) {
          // First time seeing this guild -- only emit if we already had state (not first poll)
          // No event emitted for newly discovered guilds on first poll
          continue;
        }

        // Compare each tracked field for changes
        for (let field of trackedFields) {
          let prev = known[field] ?? null;
          let curr = snapshot[field] ?? null;

          if (String(prev) !== String(curr)) {
            inputs.push({
              guildId: guild.id,
              guildName: fullGuild.name,
              changeType: field,
              previousValue: prev != null ? String(prev) : undefined,
              newValue: curr != null ? String(curr) : undefined
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownGuilds: updatedKnownGuilds
        }
      };
    },

    handleEvent: async ctx => {
      let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });

      let guildInfo: any = {};
      try {
        guildInfo = await client.getGuild(ctx.input.guildId, true);
      } catch {
        // Guild may no longer be accessible
      }

      return {
        type: `guild.${ctx.input.changeType}`,
        id: `guild-${ctx.input.guildId}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          guildId: ctx.input.guildId,
          guildName: ctx.input.guildName || guildInfo.name,
          changeType: ctx.input.changeType,
          previousValue: ctx.input.previousValue,
          newValue: ctx.input.newValue,
          ownerId: guildInfo.owner_id,
          icon: guildInfo.icon,
          verificationLevel: guildInfo.verification_level,
          memberCount: guildInfo.approximate_member_count
        }
      };
    }
  })
  .build();
