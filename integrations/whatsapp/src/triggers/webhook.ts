import type { SlateTriggerRoutingMatcher } from 'slates';
import { getMetaWebhookVerificationResponse, skipWebhook, verifyHmacSignature } from 'slates';
import { z } from 'zod';
import { getWhatsAppEventId } from '../lib/eventId';
import { buildWhatsAppPhoneNumberMatcher } from '../lib/routingMatcher';
import {
  isWhatsAppHandledMessageType,
  type WhatsAppContact,
  type WhatsAppMessageEvent,
  whatsappChangeValueSchema,
  whatsappContactSchema,
  whatsappMessageSchema,
  whatsappWebhookEnvelopeSchema
} from './event-schemas';

export let whatsappWebhookRegistrationSchema = z.object({
  appSecret: z
    .string()
    .min(1)
    .describe(
      'App Secret of the Meta app that owns the webhook, from App Dashboard > App settings > Basic'
    ),
  verifyToken: z
    .string()
    .min(1)
    .describe(
      'Verify token of your choosing. Enter the same value in the Verify token field of the WhatsApp webhook configuration.'
    )
});

export type WhatsAppWebhookRegistration = z.infer<typeof whatsappWebhookRegistrationSchema>;

// Meta signs the raw POST body with the app secret:
// https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint#post-requests
let SIGNATURE_PATTERN = /^sha256=[a-f0-9]{64}$/;

type WebhookContext = {
  input: { request: Request; webhookRegistrationPayload: unknown };
  warn: (message: object) => void;
  info: (message: object) => void;
};

let findContact = (
  contacts: WhatsAppContact[],
  message: { from?: string | null; from_user_id?: string | null }
) => {
  let match = contacts.find(
    contact =>
      (message.from && contact.wa_id === message.from) ||
      (message.from_user_id && contact.user_id === message.from_user_id)
  );
  if (match) return match;
  return contacts.length === 1 ? contacts[0] : undefined;
};

export let processWhatsAppWebhook = async (ctx: WebhookContext) => {
  let { request } = ctx.input;
  let reject = (
    status: number,
    reason: string,
    body: string,
    response: { headers?: Record<string, string> } = {}
  ) => {
    // Never log secrets or payload bodies.
    let entry = { message: body || reason, reason, status, method: request.method };
    if (status >= 400) ctx.warn(entry);
    else ctx.info(entry);
    return skipWebhook(reason, {
      status,
      headers: { 'content-type': 'text/plain', ...response.headers },
      body
    });
  };

  let registration = whatsappWebhookRegistrationSchema.safeParse(
    ctx.input.webhookRegistrationPayload
  );
  if (!registration.success) {
    return reject(
      500,
      'whatsapp_webhook_registration_invalid',
      'Invalid webhook registration.'
    );
  }

  // Meta verifies the callback URL with a GET `hub.challenge` handshake:
  // https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint#get-requests
  if (request.method === 'GET') {
    let verification = getMetaWebhookVerificationResponse(
      request,
      registration.data.verifyToken
    );
    if (verification && verification.status === 200) {
      ctx.info({ message: 'Webhook verification challenge answered.' });
      return { events: [], response: verification };
    }

    let status = verification?.status ?? 400;
    return reject(
      status,
      status === 403
        ? 'whatsapp_webhook_verify_token_invalid'
        : 'whatsapp_webhook_verification_invalid',
      typeof verification?.body === 'string' ? verification.body : 'Invalid verification.'
    );
  }

  if (request.method !== 'POST') {
    return reject(405, 'whatsapp_webhook_method_not_allowed', 'GET or POST required.', {
      headers: { Allow: 'GET, POST' }
    });
  }

  let raw = new Uint8Array(await request.arrayBuffer());
  let signature = request.headers.get('x-hub-signature-256');
  if (!signature) {
    return reject(401, 'whatsapp_webhook_signature_missing', 'Missing webhook signature.');
  }
  if (
    !SIGNATURE_PATTERN.test(signature) ||
    !verifyHmacSignature({
      secret: registration.data.appSecret,
      payload: raw,
      signature,
      algorithm: 'sha256',
      digest: 'hex',
      prefix: 'sha256='
    })
  ) {
    return reject(401, 'whatsapp_webhook_signature_invalid', 'Invalid webhook signature.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  } catch {
    return reject(400, 'whatsapp_webhook_json_invalid', 'Invalid webhook JSON.');
  }

  let envelope = whatsappWebhookEnvelopeSchema.safeParse(parsed);
  if (!envelope.success) {
    return reject(400, 'whatsapp_webhook_payload_invalid', 'Invalid webhook payload.');
  }

  // The same Meta app can also deliver Page/Instagram objects; only WhatsApp
  // Business Account deliveries belong to this integration.
  if (envelope.data.object !== 'whatsapp_business_account') {
    return reject(200, 'whatsapp_webhook_object_unsupported', '');
  }

  let events: {
    matchers: SlateTriggerRoutingMatcher[];
    payload: WhatsAppMessageEvent;
    idempotencyKey: string;
  }[] = [];
  let ignored: Record<string, number> = {};
  let ignore = (reason: string, count = 1) => {
    if (count > 0) ignored[reason] = (ignored[reason] ?? 0) + count;
  };

  for (let entry of envelope.data.entry) {
    for (let change of entry.changes ?? []) {
      if (change.field !== 'messages') {
        ignore('field_unsupported');
        continue;
      }

      let value = whatsappChangeValueSchema.safeParse(change.value);
      if (!value.success) {
        ignore('value_invalid');
        continue;
      }

      ignore('statuses', value.data.statuses?.length ?? 0);
      ignore('errors', value.data.errors?.length ?? 0);

      let phoneNumberId = value.data.metadata?.phone_number_id?.trim();
      if (!phoneNumberId) {
        ignore('phone_number_missing', value.data.messages?.length ?? 0);
        continue;
      }

      let contacts = (value.data.contacts ?? []).flatMap(contact => {
        let parsedContact = whatsappContactSchema.safeParse(contact);
        return parsedContact.success ? [parsedContact.data] : [];
      });

      for (let rawMessage of value.data.messages ?? []) {
        let message = whatsappMessageSchema.safeParse(rawMessage);
        if (!message.success) {
          ignore('message_invalid');
          continue;
        }

        // Groups API messages belong to a group conversation, not the sender's
        // 1:1 chat; this adapter only models 1:1 customer conversations.
        if (message.data.group_id) {
          ignore('group_message');
          continue;
        }

        if (!isWhatsAppHandledMessageType(message.data.type)) {
          ignore(`type_${message.data.type}`);
          continue;
        }

        if (!message.data.from && !message.data.from_user_id) {
          ignore('sender_missing');
          continue;
        }

        let payload: WhatsAppMessageEvent = {
          kind: 'message',
          wabaId: entry.id ?? undefined,
          phoneNumberId,
          displayPhoneNumber: value.data.metadata?.display_phone_number ?? undefined,
          contact: findContact(contacts, message.data),
          message: message.data
        };

        events.push({
          matchers: [buildWhatsAppPhoneNumberMatcher(phoneNumberId)],
          payload,
          idempotencyKey: getWhatsAppEventId(message.data)
        });
      }
    }
  }

  if (events.length === 0) {
    ctx.info({
      message: 'Webhook delivery contained no inbound customer messages to emit.',
      ignored
    });
    return skipWebhook('whatsapp_webhook_no_supported_events', { status: 200, body: '' });
  }

  if (Object.keys(ignored).length > 0) {
    ctx.info({ message: 'Ignored part of a webhook delivery.', ignored });
  }

  return { events, response: { status: 200, body: '' } };
};
