import { parse } from 'lossless-json';
import { skipWebhook, timingSafeStringEqual } from 'slates';
import { leadWebhookSchema } from './event-schemas';
import { leadRegistrationSchema } from './registration';

// https://developers.google.com/google-ads/webhook/docs/implementation documents "{}" as the 200 body.
const accepted = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: '{}'
};

export const processLeadWebhook = async (
  input: { request: Request; webhookRegistrationPayload: unknown },
  log: { info: (message: object) => void; warn: (message: object) => void }
) => {
  const reject = (reason: string, status: number, headers?: Record<string, string>) => {
    const code = `google_ads_lead_webhook_${reason}`;
    log.warn({ reason: code });
    return skipWebhook(code, { status, headers, body: '' });
  };
  const registration = leadRegistrationSchema.safeParse(input.webhookRegistrationPayload);
  if (!registration.success) return reject('registration_invalid', 500);
  if (input.request.method !== 'POST') return reject('method_invalid', 405, { Allow: 'POST' });
  let body: unknown;
  try {
    const bytes = await input.request.arrayBuffer();
    if (bytes.byteLength > 2 * 1024 * 1024) return reject('body_too_large', 413);
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Integers stay distinct from strings during validation; ID schemas turn bigints into decimal
    // strings. A run over 19 digits is never an int64, so it is not converted exactly.
    body = parse(raw, undefined, number =>
      /^-?\d{1,19}$/.test(number) ? BigInt(number) : Number(number)
    );
  } catch {
    return reject('body_invalid', 400);
  }
  const parsed = leadWebhookSchema.safeParse(body);
  if (!parsed.success) return reject('payload_invalid', 400);
  const lead = parsed.data;
  // This is a shared body secret, NOT a signature or a signed freshness claim.
  if (!timingSafeStringEqual(registration.data.googleSecret, lead.google_key))
    return reject('key_invalid', 401);
  const formIdentityMatched = lead.form_id === registration.data.assetId;
  if (lead.is_test === true) {
    log.info({ reason: 'google_ads_lead_webhook_test_acknowledged', formIdentityMatched });
    return { events: [], response: accepted };
  }
  // The key is the only authentication. form_id is not documented as the asset ID and a 4xx is
  // never retried, so a mismatch is reported, not rejected.
  if (!formIdentityMatched) {
    log.warn({ reason: 'google_ads_lead_webhook_form_id_differs', formIdentityMatched });
  }
  const { google_key: _key, is_test: _test, ...event } = lead;
  const payload = {
    ...event,
    type: 'lead.received' as const,
    customerId: registration.data.customerId
  };
  return {
    events: [{ payload, idempotencyKey: lead.lead_id, matchers: [] }],
    response: accepted
  };
};
