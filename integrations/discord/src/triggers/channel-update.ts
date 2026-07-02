import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let channelUpdate = SlateTrigger.create(spec, {
  name: 'Channel Update',
  key: 'channel_update',
  description:
    'Triggers when channels in a Discord guild are created, deleted, or updated. Polls the guild channels list to detect changes.'
})
  .scopes(discordActionScopes.channelUpdate)
  .input(
    z.object({
      eventType: z.enum(['created', 'deleted', 'updated']).describe('Type of channel event'),
      guildId: z.string().describe('Guild ID'),
      channelId: z.string().describe('Channel ID'),
      channelName: z.string().optional().describe('Channel name'),
      channelType: z
        .number()
        .optional()
        .describe('Channel type (0=text, 2=voice, 4=category, etc.)'),
      topic: z.string().optional().describe('Channel topic')
    })
  )
  .output(
    z.object({
      eventType: z.enum(['created', 'deleted', 'updated']).describe('Type of channel event'),
      guildId: z.string().describe('Guild ID'),
      channelId: z.string().describe('Channel ID'),
      channelName: z.string().optional().describe('Channel name'),
      channelType: z
        .number()
        .optional()
        .describe('Channel type (0=text, 2=voice, 4=category, etc.)'),
      topic: z.string().optional().describe('Channel topic'),
      parentId: z.string().optional().describe('Parent category channel ID'),
      position: z.number().optional().describe('Sorting position of the channel')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
      let state = ctx.state as {
        knownChannels?: Record<string, { name?: string; topic?: string; type?: number }>;
      } | null;
      let knownChannels = state?.knownChannels || {};

      let guilds = await client.listCurrentUserGuilds(200);

      let inputs: Array<{
        eventType: 'created' | 'deleted' | 'updated';
        guildId: string;
        channelId: string;
        channelName?: string;
        channelType?: number;
        topic?: string;
      }> = [];

      let updatedKnownChannels: Record<
        string,
        { name?: string; topic?: string; type?: number }
      > = {};
      let currentChannelIds = new Set<string>();

      for (let guild of guilds) {
        let channels: any[];
        try {
          channels = await client.getGuildChannels(guild.id);
        } catch {
          continue;
        }

        for (let channel of channels) {
          currentChannelIds.add(channel.id);
          updatedKnownChannels[channel.id] = {
            name: channel.name,
            topic: channel.topic || undefined,
            type: channel.type
          };

          let known = knownChannels[channel.id];

          if (!known) {
            if (Object.keys(knownChannels).length > 0) {
              inputs.push({
                eventType: 'created',
                guildId: guild.id,
                channelId: channel.id,
                channelName: channel.name,
                channelType: channel.type,
                topic: channel.topic || undefined
              });
            }
          } else if (
            channel.name !== known.name ||
            (channel.topic || undefined) !== known.topic ||
            channel.type !== known.type
          ) {
            inputs.push({
              eventType: 'updated',
              guildId: guild.id,
              channelId: channel.id,
              channelName: channel.name,
              channelType: channel.type,
              topic: channel.topic || undefined
            });
          }
        }
      }

      // Detect deleted channels
      if (Object.keys(knownChannels).length > 0) {
        for (let channelId of Object.keys(knownChannels)) {
          if (!currentChannelIds.has(channelId)) {
            let known = knownChannels[channelId]!;
            inputs.push({
              eventType: 'deleted',
              guildId: '',
              channelId,
              channelName: known?.name,
              channelType: known?.type,
              topic: known?.topic
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownChannels: updatedKnownChannels
        }
      };
    },

    handleEvent: async ctx => {
      let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });

      let channelInfo: any = {};
      if (ctx.input.eventType !== 'deleted') {
        try {
          channelInfo = await client.getChannel(ctx.input.channelId);
        } catch {
          // Channel may have been deleted between poll and handle
        }
      }

      return {
        type: `channel.${ctx.input.eventType}`,
        id: `channel-${ctx.input.channelId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          eventType: ctx.input.eventType,
          guildId: ctx.input.guildId || channelInfo.guild_id,
          channelId: ctx.input.channelId,
          channelName: ctx.input.channelName || channelInfo.name,
          channelType: ctx.input.channelType ?? channelInfo.type,
          topic: ctx.input.topic || channelInfo.topic || undefined,
          parentId: channelInfo.parent_id || undefined,
          position: channelInfo.position
        }
      };
    }
  })
  .build();
