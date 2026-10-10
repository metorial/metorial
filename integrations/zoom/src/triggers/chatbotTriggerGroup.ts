import type { SlateTriggerRoutingMatcher } from '@slates/provider';
import {
  createHmacSignature,
  skipWebhook,
  triggerGroup,
  verifyHmacSignature
} from '@slates/provider';
import { z } from 'zod';
import {
  buildZoomChatbotRoutingMatcher,
  buildZoomChatbotRoutingMatchers
} from '../lib/routingMatcher';
import { spec } from '../spec';

/** Zoom does not document a replay window; this mirrors the common 5 minute tolerance. */
export let ZOOM_WEBHOOK_MAX_AGE_SECONDS = 300;

let webhookConfigSchema = z.object({
  secretToken: z
    .string()
    .min(1)
    .describe(
      'Secret Token from the app build flow (Features page), used to verify every request from Zoom'
    ),
  botJid: z.string().min(1).describe('Bot JID from Features > Surface > Chat Subscription'),
  slashCommand: z
    .string()
    .min(1)
    .describe('Slash command entered in Chat Subscription, for example /mybot')
});

type ZoomWebhookConfig = z.infer<typeof webhookConfigSchema>;

let envelopeSchema = z
  .object({
    event: z.string().min(1),
    event_ts: z.number().optional(),
    payload: z.record(z.string(), z.unknown()).optional()
  })
  .loose();

let validationPayloadSchema = z.object({ plainToken: z.string().min(1) }).loose();

let botNotificationPayloadSchema = z
  .object({
    accountId: z.string().min(1),
    robotJid: z.string().min(1),
    toJid: z.string().min(1),
    userJid: z.string().min(1),
    cmd: z.string().optional(),
    timestamp: z.number().optional(),
    triggerId: z.string().optional()
  })
  .loose();

/** Event payload emitted to the chatbot triggers. */
export let zoomChatbotEventSchema = z
  .object({
    event: z.string(),
    event_ts: z.number().optional(),
    payload: z.record(z.string(), z.unknown()),
    commandName: z.string().optional()
  })
  .loose();

export type ZoomChatbotEvent = z.infer<typeof zoomChatbotEventSchema>;

let jsonResponse = (status: number, body?: unknown) => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? '' : JSON.stringify(body)
});

let normalizeCommand = (value: string) => value.trim().replace(/^\/+/, '');

/**
 * Stable per-delivery identity for a `bot_notification`: Zoom's `triggerId`
 * when present, otherwise robot/destination/user plus the event timestamp.
 */
export let getZoomBotNotificationKey = (
  payload: Record<string, unknown>,
  eventTs?: number
) => {
  if (typeof payload.triggerId === 'string' && payload.triggerId) {
    return `trigger:${payload.triggerId}`;
  }
  let timestamp =
    typeof payload.timestamp === 'number' ? payload.timestamp : (eventTs ?? 'unknown');
  return [
    'notification',
    String(payload.robotJid ?? '').toLowerCase(),
    String(payload.toJid ?? '').toLowerCase(),
    String(payload.userJid ?? '').toLowerCase(),
    String(timestamp)
  ].join(':');
};

export let zoomChatbotTriggerGroup = triggerGroup(spec, {
  key: 'chatbot_events',
  name: 'Team Chat Chatbot Events',
  description:
    'Receives Zoom Team Chat chatbot requests (slash command and chatbot messages) sent to the Bot Endpoint URL.',
  eventSchema: zoomChatbotEventSchema
})
  .webhook({
    manualRegistration: {
      userConfigSchema: webhookConfigSchema,
      fullConfigSchema: webhookConfigSchema,

      setup: async ctx => ({
        webhookSetupDocument: [
          '1. In the Zoom App Marketplace, open your General app (Develop > Build App), then go to **Features > Surface**.',
          '2. Under **Select where to use your app**, select **Chat**, then enable **Chat Subscription**.',
          '3. Enter the slash command users type to talk to the chatbot (for example `mybot`), set the **Bot Endpoint URL** to the URL below, and save:',
          '',
          `\`\`\`\n${ctx.input.webhookUrl}\n\`\`\``,
          '',
          '4. Copy the **Bot JID** that Chat Subscription now shows and the app **Secret Token** (**Features > Access**), then enter them here together with the slash command.',
          '',
          '> NOTE: The endpoint rejects requests from Zoom, including its `endpoint.url_validation` check, until you finish this setup. Zoom does not need to reach it while you save the URL.'
        ].join('\n'),
        partialWebhookRegistrationPayload: {}
      }),

      finish: async ctx => ({
        webhookRegistrationPayload: webhookConfigSchema.parse({
          ...(ctx.input.partialWebhookRegistrationPayload ?? {}),
          ...(ctx.input.userWebhookRegistrationPayload ?? {})
        })
      })
    },

    process: async ctx => {
      let { request } = ctx.input;
      let saved = webhookConfigSchema.safeParse(ctx.input.webhookRegistrationPayload);
      if (!saved.success) {
        ctx.warn({ message: 'Rejected Zoom webhook: saved registration is incomplete' });
        return {
          events: [],
          response: jsonResponse(500, { error: 'webhook registration is incomplete' })
        };
      }
      let config: ZoomWebhookConfig = saved.data;

      if (request.method.toUpperCase() !== 'POST') {
        return skipWebhook('zoom_webhook_method_not_allowed', {
          status: 405,
          headers: { allow: 'POST', 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'method not allowed' })
        });
      }

      let rawBytes = new Uint8Array(await request.arrayBuffer());
      let timestamp = request.headers.get('x-zm-request-timestamp');
      let signature = request.headers.get('x-zm-signature');

      if (!timestamp || !signature) {
        ctx.warn({ message: 'Rejected Zoom webhook: missing signature headers' });
        return skipWebhook(
          'zoom_webhook_signature_missing',
          jsonResponse(401, { error: 'missing signature headers' })
        );
      }

      if (!/^\d{1,13}$/.test(timestamp) || !/^v0=[a-f0-9]{64}$/.test(signature)) {
        ctx.warn({ message: 'Rejected Zoom webhook: malformed signature headers' });
        return skipWebhook(
          'zoom_webhook_signature_malformed',
          jsonResponse(401, { error: 'malformed signature headers' })
        );
      }

      let ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (!Number.isFinite(ageSeconds) || ageSeconds > ZOOM_WEBHOOK_MAX_AGE_SECONDS) {
        ctx.warn({ message: 'Rejected Zoom webhook: stale request', ageSeconds });
        return skipWebhook(
          'zoom_webhook_request_stale',
          jsonResponse(401, { error: 'stale request' })
        );
      }

      let rawBody: string;
      try {
        rawBody = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
      } catch {
        return skipWebhook(
          'zoom_webhook_body_invalid_utf8',
          jsonResponse(400, { error: 'invalid body encoding' })
        );
      }

      // https://developers.zoom.us/docs/api/webhooks/#verify-with-zooms-header
      let signatureValid = verifyHmacSignature({
        secret: config.secretToken,
        payload: `v0:${timestamp}:${rawBody}`,
        algorithm: 'sha256',
        digest: 'hex',
        prefix: 'v0=',
        signature
      });

      if (!signatureValid) {
        ctx.warn({ message: 'Rejected Zoom webhook: invalid signature' });
        return skipWebhook(
          'zoom_webhook_signature_invalid',
          jsonResponse(401, { error: 'invalid signature' })
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        return skipWebhook(
          'zoom_webhook_json_invalid',
          jsonResponse(400, { error: 'invalid json' })
        );
      }

      let envelope = envelopeSchema.safeParse(parsed);
      if (!envelope.success) {
        return skipWebhook(
          'zoom_webhook_envelope_invalid',
          jsonResponse(400, { error: 'invalid envelope' })
        );
      }

      let body = envelope.data;

      // https://developers.zoom.us/docs/api/webhooks/#validate-your-webhook-endpoint
      if (body.event === 'endpoint.url_validation') {
        let validation = validationPayloadSchema.safeParse(body.payload);
        if (!validation.success) {
          return skipWebhook(
            'zoom_webhook_validation_invalid',
            jsonResponse(400, { error: 'missing plainToken' })
          );
        }

        let plainToken = validation.data.plainToken;
        return {
          events: [],
          response: jsonResponse(200, {
            plainToken,
            encryptedToken: createHmacSignature({
              secret: config.secretToken,
              payload: plainToken,
              algorithm: 'sha256',
              digest: 'hex'
            })
          })
        };
      }

      if (body.event !== 'bot_notification') {
        ctx.info({ message: 'Ignored Zoom chatbot request', event: body.event });
        return skipWebhook(
          'zoom_webhook_ignored_event_type',
          jsonResponse(200, { ok: true, reason: 'ignored_event_type' })
        );
      }

      let notification = botNotificationPayloadSchema.safeParse(body.payload);
      if (!notification.success) {
        return skipWebhook(
          'zoom_webhook_payload_invalid',
          jsonResponse(400, { error: 'invalid bot_notification payload' })
        );
      }

      let payload = notification.data;
      if (payload.robotJid.trim().toLowerCase() !== config.botJid.trim().toLowerCase()) {
        ctx.warn({ message: 'Rejected Zoom webhook: chatbot does not match registration' });
        return skipWebhook(
          'zoom_webhook_bot_mismatch',
          jsonResponse(403, { error: 'chatbot does not match this endpoint' })
        );
      }

      let matchers: SlateTriggerRoutingMatcher[] = [
        buildZoomChatbotRoutingMatcher({
          botJid: payload.robotJid,
          accountId: payload.accountId
        })
      ];

      return {
        events: [
          {
            matchers,
            payload: {
              event: body.event,
              event_ts: body.event_ts,
              payload: body.payload ?? {},
              commandName: normalizeCommand(config.slashCommand)
            },
            idempotencyKey: getZoomBotNotificationKey(payload, body.event_ts)
          }
        ],
        response: jsonResponse(200)
      };
    }
  })
  // Only chatbot auth carries the Bot JID deliveries are addressed to; user auth yields no matchers.
  .routingMatchers(async ctx => buildZoomChatbotRoutingMatchers(ctx.auth))
  .build();
