import { skipWebhook, verifyHmacSignature } from '@slates/provider';
import { z } from 'zod';
import { stripeEventEnvelopeSchema } from './event-schemas';
import { enabledStripeEvents } from './event-types';

export const stripeTargetSchema = z.object({
  accountId: z.string().regex(/^acct_[a-zA-Z0-9]+$/),
  livemode: z.boolean()
});
export const stripeRegistrationSchema = stripeTargetSchema.extend({
  endpointId: z.string().regex(/^we_[a-zA-Z0-9]+$/),
  signingSecret: z.string().startsWith('whsec_').min(7)
});
export const stripeTargetIdentifier = (target: z.infer<typeof stripeTargetSchema>) =>
  `${target.accountId}:${target.livemode ? 'live' : 'test'}`;

const SIGNATURE_TOLERANCE_SECONDS = 300;
const supportedEvents = new Set<string>(enabledStripeEvents);

export const processStripeWebhook = async (input: {
  request: Request;
  webhookRegistrationPayload: unknown;
}) => {
  const registration = stripeRegistrationSchema.safeParse(input.webhookRegistrationPayload);
  if (!registration.success)
    return skipWebhook('stripe_webhook_registration_invalid', { status: 500, body: '' });
  if (input.request.method !== 'POST')
    return skipWebhook('stripe_webhook_method_invalid', {
      status: 405,
      body: '',
      headers: { Allow: 'POST' }
    });

  const header = input.request.headers.get('stripe-signature');
  if (!header)
    return skipWebhook('stripe_webhook_signature_missing', { status: 400, body: '' });
  const parts = header.split(',').map(part => part.trim().split('='));
  const timestamps = parts.filter(([key]) => key === 't');
  const timestamp = timestamps[0]?.[1];
  const seconds = Number(timestamp);
  if (
    timestamps.length !== 1 ||
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    !Number.isSafeInteger(seconds) ||
    Math.abs(Date.now() / 1000 - seconds) > SIGNATURE_TOLERANCE_SECONDS
  )
    return skipWebhook('stripe_webhook_timestamp_invalid', { status: 400, body: '' });

  const raw = await input.request.text();
  const valid = parts.some(
    ([key, signature]) =>
      key === 'v1' &&
      typeof signature === 'string' &&
      /^[a-fA-F0-9]{64}$/.test(signature) &&
      verifyHmacSignature({
        secret: registration.data.signingSecret,
        payload: `${timestamp}.${raw}`,
        signature,
        digest: 'hex'
      })
  );
  if (!valid)
    return skipWebhook('stripe_webhook_signature_invalid', { status: 400, body: '' });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return skipWebhook('stripe_webhook_json_invalid', { status: 400, body: '' });
  }
  const event = stripeEventEnvelopeSchema.safeParse(body);
  if (!event.success)
    return skipWebhook('stripe_webhook_envelope_invalid', { status: 400, body: '' });
  const target = registration.data;
  if (
    event.data.livemode !== target.livemode ||
    (typeof event.data.account === 'string' && event.data.account !== target.accountId)
  )
    return skipWebhook('stripe_webhook_target_mismatch', { status: 200, body: '' });
  if (!supportedEvents.has(event.data.type))
    return skipWebhook('stripe_webhook_event_unsupported', { status: 200, body: '' });

  return {
    events: [
      {
        payload: event.data,
        matchers: [],
        idempotencyKey: event.data.id
      }
    ],
    response: { status: 200, body: '' }
  };
};
