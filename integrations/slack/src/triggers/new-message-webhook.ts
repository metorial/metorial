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
        timeoutMs: 1500,
        match: [
          {
            jsonBodyField: {
              path: 'type',
              equals: 'url_verification'
            }
          }
        ]
      },
      ingress: {
        kind: 'receiver_route',
        baseline: 'receiver_path_secret',
        verification: {
          mechanism: 'hub',
          baseline: 'receiver_path_secret',
          allowedSecretRefs: [
            {
              source: 'config',
              name: 'slack_signing_secret',
              configKey: 'signingSecret',
              encoding: 'utf8'
            }
          ],
          rules: [
            {
              id: 'slack.bootstrap.v1',
              phase: 'bootstrap',
              when: {
                methods: ['POST'],
                matcher: {
                  jsonBodyField: { path: '/type', equals: 'url_verification' }
                }
              },
              verify: { type: 'preset', preset: 'slack.v0' },
              result: { type: 'sync_only' },
              replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
            },
            {
              id: 'slack.delivery.v1',
              phase: 'delivery',
              when: {
                methods: ['POST'],
                matcher: { jsonBodyField: { path: '/type', equals: 'event_callback' } }
              },
              verify: { type: 'preset', preset: 'slack.v0' },
              result: { type: 'dispatch', scope: 'receiver_trigger' },
              replay: {
                kind: 'enforced',
                freshness: {
                  source: 'preset',
                  presetField: 'timestamp',
                  format: 'unix_seconds',
                  maxAgeSeconds: 300,
                  maxFutureSkewSeconds: 300
                },
                deduplicate: {
                  source: 'json_pointer',
                  pointer: '/event_id',
                  ttlSeconds: 604_800,
                  scope: 'request'
                }
              }
            }
          ]
        }
      }
    },
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
