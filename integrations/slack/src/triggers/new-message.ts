import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    '[Polling fallback] Triggers when a new message is posted in one or more Slack channels. Polls conversation history for new messages.'
})
  .scopes(slackActionScopes.messagePolling)
  .input(
    z.object({
      messageTs: z.string().describe('Message timestamp'),
      channelId: z.string().describe('Channel ID where the message was posted'),
      text: z.string().optional().describe('Message text'),
      userId: z.string().optional().describe('User ID of the message author'),
      threadTs: z.string().optional().describe('Thread parent timestamp'),
      subtype: z.string().optional().describe('Message subtype'),
      botId: z.string().optional().describe('Bot ID if from a bot')
    })
  )
  .output(
    z.object({
      messageTs: z.string().describe('Message timestamp'),
      channelId: z.string().describe('Channel ID'),
      text: z.string().optional().describe('Message text'),
      userId: z.string().optional().describe('User ID of the message author'),
      threadTs: z.string().optional().describe('Thread parent timestamp if a thread reply'),
      subtype: z.string().optional().describe('Message subtype'),
      botId: z.string().optional().describe('Bot ID if posted by a bot'),
      isThread: z.boolean().describe('Whether this message is a thread reply')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SlackClient(ctx.auth.token);
      let state = ctx.state as { lastTs?: string; channelIds?: string[] } | null;
      let lastTs = state?.lastTs;

      // Fetch channels the bot is a member of
      let channelResult = await client.listConversations({
        types: 'public_channel,private_channel',
        excludeArchived: true,
        limit: 100
      });

      let memberChannels = channelResult.channels.filter(c => c.is_member);
      let allInputs: Array<{
        messageTs: string;
        channelId: string;
        text?: string;
        userId?: string;
        threadTs?: string;
        subtype?: string;
        botId?: string;
      }> = [];

      let newestTs = lastTs;

      for (let channel of memberChannels) {
        try {
          let history = await client.getConversationHistory({
            channel: channel.id,
            oldest: lastTs,
            limit: 50
          });

          for (let msg of history.messages) {
            if (lastTs && msg.ts <= lastTs) continue;

            allInputs.push({
              messageTs: msg.ts,
              channelId: channel.id,
              text: msg.text,
              userId: msg.user,
              threadTs: msg.thread_ts,
              subtype: msg.subtype,
              botId: msg.bot_id
            });

            if (!newestTs || msg.ts > newestTs) {
              newestTs = msg.ts;
            }
          }
        } catch {
          // Skip channels we can't read
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastTs: newestTs || lastTs
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.subtype ? `message.${ctx.input.subtype}` : 'message.new',
        id: `${ctx.input.channelId}-${ctx.input.messageTs}`,
        output: {
          messageTs: ctx.input.messageTs,
          channelId: ctx.input.channelId,
          text: ctx.input.text,
          userId: ctx.input.userId,
          threadTs: ctx.input.threadTs,
          subtype: ctx.input.subtype,
          botId: ctx.input.botId,
          isThread: !!ctx.input.threadTs
        }
      };
    }
  })
  .build();
