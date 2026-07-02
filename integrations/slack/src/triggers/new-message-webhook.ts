import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let slackEventBody = z.object({
  type: z.string(),
  challenge: z.string().optional(),
  event: z
    .object({
      type: z.string(),
      channel: z.string().optional(),
      user: z.string().optional(),
      text: z.string().optional(),
      ts: z.string().optional(),
      thread_ts: z.string().optional(),
      subtype: z.string().optional(),
      bot_id: z.string().optional()
    })
    .passthrough()
    .optional()
});

export let newMessageWebhook = SlateTrigger.create(spec, {
  name: 'New Message (Events API)',
  key: 'new_message_webhook',
  description:
    'Triggers when Slack sends a `message` event to the Metorial Events URL. Use with Slack Event Subscriptions and hub route POST /slates-hub/slack/events. Complements the polling “New Message” trigger.'
})
  .scopes(slackActionScopes.messageEvents)
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
  .webhook({
    handleRequest: async ctx => {
      let raw = await ctx.request.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { inputs: [] };
      }

      let body = slackEventBody.safeParse(parsed);
      if (!body.success) {
        return { inputs: [] };
      }

      if (body.data.type === 'url_verification' && body.data.challenge) {
        return { inputs: [] };
      }

      if (body.data.type !== 'event_callback' || !body.data.event) {
        return { inputs: [] };
      }

      let ev = body.data.event;
      if (ev.type !== 'message' || !ev.ts || !ev.channel) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            messageTs: ev.ts,
            channelId: ev.channel,
            text: ev.text,
            userId: ev.user,
            threadTs: ev.thread_ts,
            subtype: ev.subtype,
            botId: ev.bot_id
          }
        ]
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
