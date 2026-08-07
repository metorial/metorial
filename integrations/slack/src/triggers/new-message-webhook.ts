import { SlateTrigger, verifyHmacSignature } from 'slates';
import { z } from 'zod';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

const SLACK_MAX_REQUEST_AGE_SECONDS = 300;

let invalidSignatureResponse = () => ({
  inputs: [],
  response: {
    status: 401,
    body: 'invalid signature'
  }
});

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
    "Triggers when Slack sends a `message` event through Event Subscriptions. Use a customer-owned Slack app and set its Events Request URL to this callback instance's `webhookUrl`. Slack supports one Events Request URL per app, so use a separate app for each callback instance. Complements the polling “New Message” trigger."
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
    http: {
      methods: ['POST'],
      sync: {
        mode: 'match',
        match: [
          {
            jsonBodyField: {
              path: 'type',
              equals: 'url_verification'
            }
          }
        ]
      }
    },
    handleRequest: async ctx => {
      let raw = await ctx.request.text();

      if (ctx.config.signingSecret) {
        let timestamp = ctx.request.headers.get('x-slack-request-timestamp');
        let signature = ctx.request.headers.get('x-slack-signature');
        let timestampSeconds = timestamp ? Number(timestamp) : Number.NaN;
        let currentTimestampSeconds = Date.now() / 1_000;
        let timestampIsFresh =
          Number.isFinite(timestampSeconds) &&
          Math.abs(currentTimestampSeconds - timestampSeconds) <=
            SLACK_MAX_REQUEST_AGE_SECONDS;

        if (
          !timestamp ||
          !signature ||
          !timestampIsFresh ||
          !verifyHmacSignature({
            secret: ctx.config.signingSecret,
            payload: `v0:${timestamp}:${raw}`,
            signature,
            digest: 'hex',
            prefix: 'v0='
          })
        ) {
          return invalidSignatureResponse();
        }
      }

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
        return {
          inputs: [],
          response: {
            status: 200,
            headers: {
              'content-type': 'text/plain'
            },
            body: body.data.challenge
          }
        };
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
