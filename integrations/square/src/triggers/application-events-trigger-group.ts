import { skipWebhook, triggerGroup, verifyHmacSignature } from 'slates';
import { squareServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  squareEventEnvelopeSchema,
  squareRegistrationInputSchema,
  squareRegistrationSchema
} from './event-schemas';
import {
  hasCurrentSquareEventData,
  isSupportedSquareEvent,
  supportedSquareEventTypes
} from './event-types';

const MAX_RETRY_AGE_MS = 24 * 60 * 60 * 1000 + 5 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const SIGNATURE_HEADER = 'x-square-hmacsha256-signature';
const response = (status: number, headers?: Record<string, string>) => ({
  status,
  body: '',
  headers
});

export const squareRoutingMatcher = (identity: {
  applicationId: string;
  environment: 'production' | 'sandbox';
  merchantId: string;
}) => ({
  applicationId: identity.applicationId,
  environment: identity.environment,
  merchantId: identity.merchantId
});

export const squareApplicationEvents = triggerGroup(spec, {
  key: 'application_events',
  name: 'Square Application Events',
  description:
    'Payment, order, customer, invoice, catalog, inventory, refund, booking, dispute, subscription, and loyalty changes for connected sellers.',
  eventSchema: squareEventEnvelopeSchema
})
  .webhook({
    manualRegistration: {
      userConfigSchema: squareRegistrationInputSchema,
      fullConfigSchema: squareRegistrationSchema,
      setup: async ctx => {
        const notificationUrl = ctx.input.webhookUrl;
        if (
          !squareRegistrationSchema.shape.notificationUrl.safeParse(notificationUrl).success
        ) {
          throw squareServiceError('Square webhook notification URL must be HTTPS.');
        }
        return {
          webhookSetupDocument: [
            'Register one webhook subscription for this Square application and environment. It serves all connected sellers for that application.',
            '',
            '1. Open the Square Developer Console, select the application and the same Sandbox or Production environment used for its connections, then open **Webhooks**.',
            '2. Create one subscription with API version **2026-09-16** and this exact notification URL:',
            '',
            `\`\`\`\n${notificationUrl}\n\`\`\``,
            '',
            `3. Enable these event types: ${supportedSquareEventTypes.map(type => `\`${type}\``).join(', ')}.`,
            '4. Copy the application ID and the subscription-specific signature key into the setup fields, and select the same environment. Finish setup before sending a test event; verification cannot succeed until the key is saved.',
            '',
            'Square webhook subscriptions use application credentials. A seller OAuth token cannot create this application-level subscription. Platform applications register once globally per application/environment; customer-owned applications register once per tenant application/environment. Connected sellers must grant the read permissions for the event families they use. Booking notifications with seller-level access also require APPOINTMENTS_ALL_READ in addition to APPOINTMENTS_READ.'
          ].join('\n'),
          partialWebhookRegistrationPayload: { notificationUrl }
        };
      },
      finish: async ctx => {
        const result = squareRegistrationSchema.safeParse({
          ...ctx.input.partialWebhookRegistrationPayload,
          ...ctx.input.userWebhookRegistrationPayload
        });
        if (!result.success || result.data.notificationUrl !== ctx.input.webhookUrl) {
          throw squareServiceError(
            'Square webhook setup does not match the issued notification URL or required application details. Start setup again.'
          );
        }
        return { webhookRegistrationPayload: result.data };
      }
    },
    process: async ctx => {
      const reject = (reason: string, status: number, headers?: Record<string, string>) => {
        ctx.warn({ message: 'Rejected Square webhook delivery', reason });
        return skipWebhook(reason, response(status, headers));
      };
      const registration = squareRegistrationSchema.safeParse(
        ctx.input.webhookRegistrationPayload
      );
      if (!registration.success) return reject('square_webhook_registration_invalid', 500);
      const request = ctx.input.request;
      if (request.method !== 'POST') {
        return reject('square_webhook_method_invalid', 405, { Allow: 'POST' });
      }
      if (request.url !== registration.data.notificationUrl) {
        return reject('square_webhook_url_mismatch', 403);
      }
      const signature = request.headers.get(SIGNATURE_HEADER);
      if (!signature) return reject('square_webhook_signature_missing', 403);
      // A SHA-256 digest is exactly 44 base64 characters with one trailing padding character.
      // Reject comma-joined duplicate headers, alternate encodings, whitespace, and truncation.
      if (!/^[A-Za-z0-9+/]{43}=$/.test(signature)) {
        return reject('square_webhook_signature_malformed', 403);
      }
      const bodyBytes = new Uint8Array(await request.arrayBuffer());
      const signedBytes = Buffer.concat([
        Buffer.from(registration.data.notificationUrl, 'utf8'),
        Buffer.from(bodyBytes)
      ]);
      if (
        !verifyHmacSignature({
          secret: registration.data.signatureKey,
          payload: signedBytes,
          digest: 'base64',
          signature
        })
      ) {
        return reject('square_webhook_signature_invalid', 403);
      }
      let body: unknown;
      try {
        body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes));
      } catch {
        return reject('square_webhook_json_invalid', 400);
      }
      const parsed = squareEventEnvelopeSchema.safeParse(body);
      if (!parsed.success) return reject('square_webhook_envelope_invalid', 400);
      const event = parsed.data;
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          event.created_at
        )
      ) {
        return reject('square_webhook_created_at_invalid', 400);
      }
      const createdAtMs = Date.parse(event.created_at);
      const ageMs = Date.now() - createdAtMs;
      if (
        !Number.isFinite(createdAtMs) ||
        ageMs > MAX_RETRY_AGE_MS ||
        ageMs < -FUTURE_TOLERANCE_MS
      ) {
        return reject('square_webhook_created_at_outside_retry_window', 400);
      }
      if (!isSupportedSquareEvent(event.type)) {
        ctx.info({
          message: 'Ignored unsupported Square webhook event',
          reason: 'square_webhook_event_unsupported',
          eventType: event.type
        });
        return skipWebhook('square_webhook_event_unsupported', response(200));
      }
      if (!hasCurrentSquareEventData(event))
        return reject('square_webhook_event_data_invalid', 400);
      return {
        events: [
          {
            payload: event,
            matchers: [
              squareRoutingMatcher({
                applicationId: registration.data.applicationId,
                environment: registration.data.environment,
                merchantId: event.merchant_id
              })
            ],
            idempotencyKey: event.event_id
          }
        ],
        response: response(200)
      };
    }
  })
  .routingMatchers(async ctx => [squareRoutingMatcher(ctx.auth)])
  .build();
