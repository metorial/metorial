import { createHash, timingSafeEqual } from 'node:crypto';
import {
  decodeWebhookWireBody,
  getWebhookHeaderValues,
  type WebhookVerifyInput,
  type WebhookVerifyOutput
} from '@slates/proto';
import { z } from 'zod';

export let TEST_STATIC_TOKEN = 'test-static-token-v1';
export let TEST_HMAC_SECRET = 'test-hmac-secret-v1';
export let TEST_PROVIDER_TOKEN = 'test-provider-token-v1';
export let TEST_ED25519_PRIVATE_SEED_HEX =
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
export let TEST_ED25519_PUBLIC_KEY_HEX =
  '03a107bff3ce10be1d70dd18e74bc09967e4d6309ba50d5f1ddc8664125531b8';

let providerTokensEqual = (supplied: string, expected: string) =>
  timingSafeEqual(
    createHash('sha256').update(supplied, 'utf8').digest(),
    createHash('sha256').update(expected, 'utf8').digest()
  );

let parseProviderBoundaryBody = (input: WebhookVerifyInput) => {
  let bytes = decodeWebhookWireBody(input.originalRequest.body);
  if (bytes === null) return null;

  try {
    let parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

let readNonemptyProviderField = (
  body: Record<string, unknown>,
  field: string
): string | null => {
  let value = body[field];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

export let verifyProviderBoundaryWebhook = async (ctx: {
  input: WebhookVerifyInput;
  secrets: Record<string, { value: string; version: number } | undefined>;
}): Promise<WebhookVerifyOutput> => {
  let suppliedTokens = getWebhookHeaderValues(
    ctx.input.originalRequest,
    'x-test-provider-token'
  );
  if (suppliedTokens.length === 0 || !ctx.secrets.provider_token?.value) {
    return { status: 'rejected', code: 'credential_missing' };
  }
  if (suppliedTokens.length !== 1) {
    return { status: 'rejected', code: 'security_header_ambiguous' };
  }
  if (!providerTokensEqual(suppliedTokens[0]!, ctx.secrets.provider_token.value)) {
    return { status: 'rejected', code: 'credential_invalid' };
  }

  let body = parseProviderBoundaryBody(ctx.input);
  if (!body) return { status: 'rejected', code: 'wire_input_malformed' };

  if (ctx.input.ruleId === 'graph.change_notification.provider.v1') {
    let values = body.value;
    let candidates = ctx.input.itemAdapter?.candidates;
    let candidateIndexes = new Set<number>();
    if (
      ctx.input.itemAdapter?.id !== 'graph.body_value.v1' ||
      !candidates ||
      candidates.length === 0 ||
      !Array.isArray(values) ||
      candidates.some(candidate => {
        if (
          !Number.isInteger(candidate.index) ||
          candidate.index < 0 ||
          candidate.index >= values.length ||
          candidateIndexes.has(candidate.index)
        ) {
          return true;
        }
        candidateIndexes.add(candidate.index);
        let value = values[candidate.index];
        return value === null || typeof value !== 'object' || Array.isArray(value);
      })
    ) {
      return { status: 'rejected', code: 'wire_input_malformed' };
    }
    return {
      status: 'accepted',
      selection: {
        scope: 'verified_items',
        itemAdapterId: 'graph.body_value.v1',
        acceptedCandidateIds: candidates.map(candidate => candidate.candidateId)
      }
    };
  }

  let requiredFields =
    ctx.input.ruleId === 'braintree.delivery.v1'
      ? (['delivery_id'] as const)
      : ctx.input.ruleId === 'paypal.delivery.v1'
        ? (['event_id', 'delivery_id'] as const)
        : ctx.input.ruleId === 'zoom.delivery.v1'
          ? (['timestamp', 'event_id'] as const)
          : (['event_id'] as const);
  let authenticatedFields = Object.fromEntries(
    requiredFields.map(field => [field, readNonemptyProviderField(body, field)])
  );
  if (Object.values(authenticatedFields).some(value => value === null)) {
    return { status: 'rejected', code: 'wire_input_malformed' };
  }

  return {
    status: 'accepted',
    authenticatedFields: authenticatedFields as Record<string, string>,
    selection: { scope: 'receiver_trigger' }
  };
};

export let requireWebhookVerificationSecretVersion = (
  capturedSecretVersions: Readonly<Record<string, number>>,
  secretName: string
) => {
  let version = capturedSecretVersions[secretName];
  if (version === undefined || !Number.isInteger(version) || version <= 0) {
    throw new Error(
      `Webhook verification secret-version authority is missing or invalid for ${secretName}`
    );
  }
  return version;
};

export let registerWebhookVerificationCredential = (
  capturedSecretVersions: Readonly<Record<string, number>>,
  credential: { name: string; value: string }
) => {
  let version = requireWebhookVerificationSecretVersion(
    capturedSecretVersions,
    credential.name
  );

  return {
    registrationDetails: {
      credentialSecretName: credential.name
    },
    capturedSecrets: {
      [credential.name]: {
        value: credential.value,
        version
      }
    }
  };
};

export let webhookVerificationEchoSchema = z.object({
  receivedAt: z.string(),
  method: z.string(),
  url: z.string(),
  headers: z.record(z.string(), z.string()),
  payload: z.record(z.string(), z.unknown())
});

export type WebhookVerificationEcho = z.infer<typeof webhookVerificationEchoSchema>;

let REDACTED = '[redacted]';
let FIXED_CREDENTIAL_VALUES = [
  TEST_ED25519_PRIVATE_SEED_HEX,
  TEST_ED25519_PUBLIC_KEY_HEX,
  TEST_HMAC_SECRET,
  TEST_PROVIDER_TOKEN,
  TEST_STATIC_TOKEN
].sort((left, right) => right.length - left.length);

let redactFixedCredentialValues = (value: string) =>
  FIXED_CREDENTIAL_VALUES.reduce(
    (redacted, credential) => redacted.replaceAll(credential, REDACTED),
    value
  );

let SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-test-api-key',
  'x-test-provider-token',
  'x-test-signature',
  'x-test-ed25519-signature',
  'x-test-timestamp',
  'x-slack-signature',
  'x-slack-request-timestamp',
  'stripe-signature',
  'x-zm-signature',
  'x-zm-request-timestamp',
  'x-hubspot-signature-v3',
  'x-hubspot-request-timestamp',
  'x-gitlab-token',
  'x-zendesk-webhook-signature',
  'x-zendesk-webhook-signature-timestamp',
  'typeform-signature',
  'linear-signature',
  'x-signature-ed25519',
  'x-signature-timestamp'
]);

let normalizeHeaders = (headers: Headers) => {
  let normalized: Record<string, string> = {};
  headers.forEach((value, key) => {
    normalized[key] = SENSITIVE_HEADERS.has(key.toLowerCase())
      ? REDACTED
      : redactFixedCredentialValues(value);
  });
  return normalized;
};

let sanitizeUrl = (value: string) => {
  try {
    let url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';

    let segments = url.pathname.split('/');
    let secretIndex = segments.findLastIndex(Boolean);
    if (secretIndex >= 0) segments[secretIndex] = ':receiver-secret';
    url.pathname = segments.join('/');
    return url.toString();
  } catch {
    return '[redacted-url]';
  }
};

let isSensitivePayloadKey = (key: string) => {
  let normalized = key.toLowerCase().replaceAll('-', '').replaceAll('_', '');
  return (
    normalized === 'apikey' ||
    normalized === 'clientstate' ||
    normalized === 'triggerid' ||
    normalized === 'responseurl' ||
    normalized === 'responseurls' ||
    normalized === 'interactivitypointer' ||
    normalized === 'token' ||
    normalized.endsWith('token') ||
    normalized === 'secret' ||
    normalized.startsWith('secret') ||
    normalized.endsWith('secret')
  );
};

export let sanitizeWebhookVerificationPayload = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeWebhookVerificationPayload);
  if (typeof value === 'string') return redactFixedCredentialValues(value);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      isSensitivePayloadKey(key) ? REDACTED : sanitizeWebhookVerificationPayload(nested)
    ])
  );
};

let parseObjectPayload = (body: string): Record<string, unknown> => {
  if (!body.trim()) return {};

  try {
    let parsed: unknown = JSON.parse(body);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (sanitizeWebhookVerificationPayload(parsed) as Record<string, unknown>)
      : {
          nonObjectBody: {
            redacted: typeof parsed === 'string',
            type: parsed === null ? 'null' : typeof parsed
          }
        };
  } catch {
    return {
      malformedBody: {
        redacted: true,
        byteLength: new TextEncoder().encode(body).byteLength
      }
    };
  }
};

export let mapWebhookVerificationPayload = (
  request: Request,
  payload: Record<string, unknown>
): WebhookVerificationEcho => ({
  receivedAt: new Date().toISOString(),
  method: request.method,
  url: sanitizeUrl(request.url),
  headers: normalizeHeaders(request.headers),
  payload: sanitizeWebhookVerificationPayload(payload) as Record<string, unknown>
});

export let mapWebhookVerificationRequest = async (
  request: Request
): Promise<WebhookVerificationEcho> => {
  let body = await request.text();
  return {
    receivedAt: new Date().toISOString(),
    method: request.method,
    url: sanitizeUrl(request.url),
    headers: normalizeHeaders(request.headers),
    payload: parseObjectPayload(body)
  };
};

let WEBHOOK_EVENT_ID_FIELDS = [
  'event_id',
  'delivery_id',
  'webhookId',
  'id',
  'event_ts'
] as const;

let readWebhookEventSourceId = (payload: Record<string, unknown>) => {
  for (let field of WEBHOOK_EVENT_ID_FIELDS) {
    let value = payload[field];
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
};

export let mapWebhookVerificationEvent = (key: string, input: WebhookVerificationEcho) => {
  let sourceId =
    'candidateId' in input &&
    typeof input.candidateId === 'string' &&
    input.candidateId.trim().length > 0
      ? input.candidateId
      : (readWebhookEventSourceId(input.payload) ?? input.receivedAt);
  return {
    type: `test.webhook.${key}`,
    id: `${key}-${sourceId}`,
    output: input
  };
};
