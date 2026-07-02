import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let newReaction = SlateTrigger.create(spec, {
  name: 'New Reaction',
  key: 'new_reaction',
  description:
    '[Polling fallback] Triggers when a new emoji reaction is added to a message. Polls recent messages in channels the bot is a member of to detect new reactions.'
})
  .scopes(slackActionScopes.reactionEvents)
  .input(
    z.object({
      channelId: z.string().describe('Channel ID'),
      messageTs: z.string().describe('Message timestamp that was reacted to'),
      emoji: z.string().describe('Emoji name'),
      reactedUserIds: z.array(z.string()).describe('User IDs who reacted with this emoji'),
      count: z.number().describe('Reaction count')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Channel ID'),
      messageTs: z.string().describe('Message timestamp'),
      messageText: z.string().optional().describe('Text of the message that was reacted to'),
      emoji: z.string().describe('Emoji name'),
      reactedUserIds: z.array(z.string()).describe('User IDs who reacted'),
      count: z.number().describe('Total reaction count for this emoji')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SlackClient(ctx.auth.token);
      let state = ctx.state as {
        trackedReactions?: Record<string, Record<string, number>>;
      } | null;
      let trackedReactions = state?.trackedReactions || {};

      let channelResult = await client.listConversations({
        types: 'public_channel,private_channel',
        excludeArchived: true,
        limit: 50
      });

      let memberChannels = channelResult.channels.filter(c => c.is_member);
      let inputs: Array<{
        channelId: string;
        messageTs: string;
        emoji: string;
        reactedUserIds: string[];
        count: number;
      }> = [];

      let updatedTracked: Record<string, Record<string, number>> = {};

      for (let channel of memberChannels.slice(0, 10)) {
        try {
          let history = await client.getConversationHistory({
            channel: channel.id,
            limit: 20
          });

          for (let msg of history.messages) {
            if (!msg.reactions || msg.reactions.length === 0) continue;

            let msgKey = `${channel.id}:${msg.ts}`;
            let existingReactions = trackedReactions[msgKey] || {};
            let updatedMsgReactions: Record<string, number> = {};

            for (let reaction of msg.reactions) {
              updatedMsgReactions[reaction.name] = reaction.count;
              let previousCount = existingReactions[reaction.name] || 0;

              if (reaction.count > previousCount && Object.keys(trackedReactions).length > 0) {
                inputs.push({
                  channelId: channel.id,
                  messageTs: msg.ts,
                  emoji: reaction.name,
                  reactedUserIds: reaction.users,
                  count: reaction.count
                });
              }
            }

            updatedTracked[msgKey] = updatedMsgReactions;
          }
        } catch {
          // Skip unreadable channels
        }
      }

      return {
        inputs,
        updatedState: {
          trackedReactions: updatedTracked
        }
      };
    },

    handleEvent: async ctx => {
      let messageText: string | undefined;
      try {
        let client = new SlackClient(ctx.auth.token);
        let msgData = await client.getReactions({
          channel: ctx.input.channelId,
          timestamp: ctx.input.messageTs
        });
        messageText = msgData.text;
      } catch {
        // Couldn't fetch message text
      }

      return {
        type: 'reaction.added',
        id: `reaction-${ctx.input.channelId}-${ctx.input.messageTs}-${ctx.input.emoji}-${ctx.input.count}`,
        output: {
          channelId: ctx.input.channelId,
          messageTs: ctx.input.messageTs,
          messageText,
          emoji: ctx.input.emoji,
          reactedUserIds: ctx.input.reactedUserIds,
          count: ctx.input.count
        }
      };
    }
  })
  .build();
