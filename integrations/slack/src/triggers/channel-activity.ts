import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let channelActivity = SlateTrigger.create(spec, {
  name: 'Channel Activity',
  key: 'channel_activity',
  description:
    '[Polling fallback] Triggers when channels are created, archived, unarchived, or their membership changes. Polls the conversations list to detect changes.'
})
  .scopes(slackActionScopes.channelActivity)
  .input(
    z.object({
      eventType: z
        .enum(['created', 'archived', 'unarchived', 'updated'])
        .describe('Type of channel event'),
      channelId: z.string().describe('Channel ID'),
      channelName: z.string().optional().describe('Channel name'),
      isPrivate: z.boolean().optional().describe('Whether the channel is private'),
      creator: z.string().optional().describe('Creator user ID')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      channelName: z.string().optional().describe('Channel name'),
      isPrivate: z.boolean().optional().describe('Whether the channel is private'),
      isArchived: z.boolean().optional().describe('Whether the channel is archived'),
      creator: z.string().optional().describe('Creator user ID'),
      topic: z.string().optional().describe('Channel topic'),
      purpose: z.string().optional().describe('Channel purpose'),
      numMembers: z.number().optional().describe('Number of members')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds * 2
    },

    pollEvents: async ctx => {
      let client = new SlackClient(ctx.auth.token);
      let state = ctx.state as {
        knownChannels?: Record<string, { name?: string; isArchived?: boolean }>;
      } | null;
      let knownChannels = state?.knownChannels || {};

      let result = await client.listConversations({
        types: 'public_channel,private_channel',
        limit: 200
      });

      let inputs: Array<{
        eventType: 'created' | 'archived' | 'unarchived' | 'updated';
        channelId: string;
        channelName?: string;
        isPrivate?: boolean;
        creator?: string;
      }> = [];

      let updatedKnownChannels: Record<string, { name?: string; isArchived?: boolean }> = {};

      for (let channel of result.channels) {
        updatedKnownChannels[channel.id] = {
          name: channel.name,
          isArchived: channel.is_archived
        };

        let known = knownChannels[channel.id];

        if (!known) {
          // Only emit if we already had state (i.e., not first poll)
          if (Object.keys(knownChannels).length > 0) {
            inputs.push({
              eventType: 'created',
              channelId: channel.id,
              channelName: channel.name,
              isPrivate: channel.is_private,
              creator: channel.creator
            });
          }
        } else if (channel.is_archived && !known.isArchived) {
          inputs.push({
            eventType: 'archived',
            channelId: channel.id,
            channelName: channel.name,
            isPrivate: channel.is_private
          });
        } else if (!channel.is_archived && known.isArchived) {
          inputs.push({
            eventType: 'unarchived',
            channelId: channel.id,
            channelName: channel.name,
            isPrivate: channel.is_private
          });
        } else if (channel.name !== known.name) {
          inputs.push({
            eventType: 'updated',
            channelId: channel.id,
            channelName: channel.name,
            isPrivate: channel.is_private
          });
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
      let client = new SlackClient(ctx.auth.token);

      let channelInfo: any = {};
      try {
        channelInfo = await client.getConversationInfo(ctx.input.channelId);
      } catch {
        // Channel may have been deleted
      }

      return {
        type: `channel.${ctx.input.eventType}`,
        id: `channel-${ctx.input.channelId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          channelId: ctx.input.channelId,
          channelName: ctx.input.channelName || channelInfo.name,
          isPrivate: ctx.input.isPrivate || channelInfo.is_private,
          isArchived: channelInfo.is_archived,
          creator: ctx.input.creator || channelInfo.creator,
          topic: channelInfo.topic?.value,
          purpose: channelInfo.purpose?.value,
          numMembers: channelInfo.num_members
        }
      };
    }
  })
  .build();
