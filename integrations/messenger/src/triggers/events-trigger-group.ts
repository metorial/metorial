import {
  getMetaWebhookVerificationResponse,
  skipWebhook,
  triggerGroup,
  verifyHmacSignature
} from '@slates/provider';
import { z } from 'zod';
import {
  buildMessengerConnectionRoutingMatchers,
  buildMessengerPageRoutingMatcher,
  normalizeMessengerPageId
} from '../lib/routingMatcher';
import { spec } from '../spec';
import {
  type MessengerEvent,
  type MessengerEventType,
  messengerEventSchema,
  messengerMessagingEventSchema,
  messengerWebhookEnvelopeSchema
} from './event-schemas';

let webhookConfigSchema = z.object({
  appSecret: z
    .string()
    .min(1)
    .describe('App Secret, from the Meta app dashboard under App settings > Basic'),
  verifyToken: z
    .string()
    .min(1)
    .describe(
      'Verify Token: any string you choose. Enter the same value in the Meta app webhook settings.'
    )
});

type MessengerWebhookConfig = z.infer<typeof webhookConfigSchema>;

let SIGNATURE_PATTERN = /^sha256=[a-fA-F0-9]{64}$/;

let jsonResponse = (status: number, body?: unknown) => ({
  status,
  headers: { 'content-type': 'application/json' },
  body: body === undefined ? '' : JSON.stringify(body)
});

let normalizeParticipantIds = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  let record = value as Record<string, unknown>;
  let normalizeParticipant = (participant: unknown) => {
    if (!participant || typeof participant !== 'object' || Array.isArray(participant)) {
      return participant;
    }
    let id = normalizeMessengerPageId((participant as { id?: unknown }).id);
    return id ? { ...(participant as object), id } : participant;
  };
  return {
    ...record,
    sender: normalizeParticipant(record.sender),
    recipient: normalizeParticipant(record.recipient)
  };
};

let classifyMessagingEvent = (
  event: z.infer<typeof messengerMessagingEventSchema>
): { type: MessengerEventType; idempotencyKey: string } | { ignored: string } => {
  if (event.message) {
    // Echoes are copies of messages the Page itself sent (including messages this
    // integration sends). Dropping them here keeps the app from reacting to its
    // own output.
    if (event.message.is_echo) return { ignored: 'echo' };
    return { type: 'message', idempotencyKey: `message:${event.message.mid}` };
  }

  if (event.message_edit) {
    return {
      type: 'message_edit',
      idempotencyKey: `message_edit:${event.message_edit.mid}:${event.message_edit.num_edit ?? event.timestamp}`
    };
  }

  if (event.reaction) {
    let reaction = event.reaction;
    return {
      type: 'reaction',
      idempotencyKey: [
        'reaction',
        reaction.mid,
        event.sender.id,
        reaction.action,
        reaction.emoji ?? reaction.reaction ?? '',
        event.timestamp
      ].join(':')
    };
  }

  if ('delivery' in event) return { ignored: 'delivery' };
  if ('read' in event) return { ignored: 'read' };
  if ('postback' in event) return { ignored: 'postback' };
  return { ignored: 'unsupported' };
};

export let messengerEventsTriggerGroup = triggerGroup(spec, {
  key: 'messenger_events',
  name: 'Messenger Events',
  description:
    'Receives Messenger webhook deliveries for a Meta app and routes each conversation event to the connected Facebook Page.',
  eventSchema: messengerEventSchema
})
  .webhook({
    manualRegistration: {
      userConfigSchema: webhookConfigSchema,
      fullConfigSchema: webhookConfigSchema,

      setup: async ctx => ({
        webhookSetupDocument: [
          '1. Finish this setup first: enter the **App Secret** and a **Verify Token** below and save. Meta verifies the callback URL immediately, and verification fails until this setup is complete.',
          '2. Open your app in the [Meta App Dashboard](https://developers.facebook.com/apps/). Under **App settings > Basic**, copy the **App Secret** and enter it here.',
          '3. Choose any **Verify Token** string and enter it here.',
          '4. Open **Messenger > Messenger API Settings** (or **Webhooks**, object **Page**) and set the **Callback URL** to:',
          '',
          `\`\`\`\n${ctx.input.webhookUrl}\n\`\`\``,
          '',
          '   Enter the same **Verify Token**, then select **Verify and save**.',
          '5. Subscribe to the webhook fields `messages`, `message_reactions`, and `message_edits`.',
          '6. Under **Generate access tokens**, select **Add subscriptions** for each Facebook Page you connect and enable the same fields. Alternatively call `POST /{page-id}/subscribed_apps?subscribed_fields=messages,message_reactions,message_edits` with that Page access token.',
          '',
          'Message echoes, deliveries, reads, and postbacks are acknowledged without producing events.'
        ].join('\n'),
        partialWebhookRegistrationPayload: {}
      }),

      finish: async ctx => ({
        webhookRegistrationPayload: webhookConfigSchema.parse({
          ...ctx.input.partialWebhookRegistrationPayload,
          ...ctx.input.userWebhookRegistrationPayload
        })
      })
    },

    process: async ctx => {
      let { request, webhookRegistrationPayload } = ctx.input;

      let parsedConfig = webhookConfigSchema.safeParse(webhookRegistrationPayload);
      if (!parsedConfig.success) {
        ctx.warn({ message: 'Rejected Messenger webhook: registration payload is invalid' });
        return skipWebhook(
          'messenger_webhook_registration_invalid',
          jsonResponse(500, { error: 'webhook registration is not configured' })
        );
      }
      let config: MessengerWebhookConfig = parsedConfig.data;

      if (request.method === 'GET') {
        let verification = getMetaWebhookVerificationResponse(request, config.verifyToken);
        if (verification && verification.status === 200) {
          return { events: [], response: verification };
        }
        ctx.warn({ message: 'Rejected Messenger webhook verification request' });
        return skipWebhook(
          'messenger_webhook_verification_invalid',
          verification ?? jsonResponse(400, { error: 'invalid verification request' })
        );
      }

      if (request.method !== 'POST') {
        return skipWebhook('messenger_webhook_method_not_allowed', {
          status: 405,
          headers: { allow: 'GET, POST', 'content-type': 'application/json' },
          body: JSON.stringify({ error: 'method not allowed' })
        });
      }

      let rawBody = new Uint8Array(await request.arrayBuffer());
      let signature = request.headers.get('x-hub-signature-256');

      if (!signature) {
        ctx.warn({ message: 'Rejected Messenger webhook: missing signature header' });
        return skipWebhook(
          'messenger_webhook_signature_missing',
          jsonResponse(401, { error: 'missing signature' })
        );
      }

      if (!SIGNATURE_PATTERN.test(signature)) {
        ctx.warn({ message: 'Rejected Messenger webhook: malformed signature header' });
        return skipWebhook(
          'messenger_webhook_signature_malformed',
          jsonResponse(401, { error: 'malformed signature' })
        );
      }

      // Meta signs the exact bytes it sends (an escaped-Unicode JSON body), so the
      // HMAC is computed over the raw bytes, never a re-serialized object.
      let signatureValid = verifyHmacSignature({
        secret: config.appSecret,
        payload: rawBody,
        algorithm: 'sha256',
        digest: 'hex',
        prefix: 'sha256=',
        signature: `sha256=${signature.slice('sha256='.length).toLowerCase()}`
      });

      if (!signatureValid) {
        ctx.warn({ message: 'Rejected Messenger webhook: invalid signature' });
        return skipWebhook(
          'messenger_webhook_signature_invalid',
          jsonResponse(401, { error: 'invalid signature' })
        );
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(rawBody));
      } catch {
        ctx.warn({ message: 'Rejected Messenger webhook: body is not valid JSON' });
        return skipWebhook(
          'messenger_webhook_json_invalid',
          jsonResponse(400, { error: 'invalid json' })
        );
      }

      let envelope = messengerWebhookEnvelopeSchema.safeParse(parsed);
      if (!envelope.success) {
        ctx.warn({
          message: 'Rejected Messenger webhook: envelope is not a webhook delivery'
        });
        return skipWebhook(
          'messenger_webhook_envelope_invalid',
          jsonResponse(400, { error: 'invalid envelope' })
        );
      }

      if (envelope.data.object !== 'page') {
        ctx.info({
          message: 'Ignored Messenger webhook: unsupported object',
          object: envelope.data.object
        });
        return skipWebhook(
          'messenger_webhook_unsupported_object',
          jsonResponse(200, { ok: true, reason: 'unsupported_object' })
        );
      }

      let events: {
        payload: MessengerEvent;
        matchers: ReturnType<typeof buildMessengerPageRoutingMatcher>[];
        idempotencyKey: string;
      }[] = [];
      let ignored: Record<string, number> = {};
      let countIgnored = (reason: string) => {
        ignored[reason] = (ignored[reason] ?? 0) + 1;
      };

      for (let entry of envelope.data.entry) {
        let pageId = normalizeMessengerPageId(entry.id);
        if (!pageId) {
          countIgnored('missing_page_id');
          continue;
        }

        for (let item of entry.messaging ?? []) {
          let messaging = messengerMessagingEventSchema.safeParse(
            normalizeParticipantIds(item)
          );
          if (!messaging.success) {
            countIgnored('malformed_event');
            continue;
          }

          let classified = classifyMessagingEvent(messaging.data);
          if ('ignored' in classified) {
            countIgnored(classified.ignored);
            continue;
          }

          // Conversation events from a person are addressed to the Page that the
          // entry belongs to; anything else is not routed.
          if (messaging.data.recipient.id !== pageId) {
            countIgnored('recipient_mismatch');
            continue;
          }

          events.push({
            payload: {
              type: classified.type,
              pageId,
              entryTime: entry.time,
              messaging: messaging.data
            },
            matchers: [buildMessengerPageRoutingMatcher(pageId)],
            idempotencyKey: classified.idempotencyKey
          });
        }
      }

      if (events.length === 0) {
        ctx.info({ message: 'Ignored Messenger webhook: no supported events', ignored });
        return skipWebhook(
          'messenger_webhook_no_supported_events',
          jsonResponse(200, { ok: true, reason: 'no_supported_events' })
        );
      }

      return { events, response: jsonResponse(200) };
    }
  })
  .routingMatchers(async ctx => buildMessengerConnectionRoutingMatchers(ctx.auth, ctx.config))
  .build();
