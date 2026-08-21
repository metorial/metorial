import { createHash } from 'node:crypto';
import {
  createHmacSignature,
  decodeWebhookWireBody,
  getWebhookHeaderValues,
  type SlateWebhookHttpOptions,
  verifyHmacSignature,
  type WebhookWireRequest
} from '@slates/provider';

export let zoomWebhookHttp = {
  registration: { mode: 'manual_bootstrap' },
  methods: ['POST'],
  sync: {
    mode: 'match',
    match: [
      {
        jsonBodyField: {
          path: 'event',
          equals: 'endpoint.url_validation'
        }
      }
    ]
  },
  ingress: {
    kind: 'receiver_route',
    baseline: 'receiver_path_secret',
    verification: {
      mechanism: 'provider',
      baseline: 'receiver_path_secret',
      reason:
        'Zoom endpoint validation and signed delivery use a classified Secret Token in scoped pre-dispatch verification.',
      allowedSecretRefs: [
        {
          source: 'auth_config',
          name: 'zoom_secret_token',
          credentialKey: 'secretToken',
          encoding: 'utf8'
        }
      ],
      rules: [
        {
          id: 'zoom.bootstrap.v1',
          phase: 'bootstrap',
          when: {
            methods: ['POST'],
            registrationStatuses: ['pending', 'registering'],
            matcher: {
              jsonBodyField: { path: 'event', equals: 'endpoint.url_validation' }
            }
          },
          verify: {
            type: 'provider',
            verifierId: 'zoom.delivery.v1',
            allowedSecretRefs: ['zoom_secret_token'],
            allowedBootstrapCaptureRefs: []
          },
          result: { type: 'sync_only' },
          replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
        },
        {
          id: 'zoom.delivery.v1',
          phase: 'delivery',
          when: {
            methods: ['POST'],
            registrationStatuses: ['registered', 'renewing']
          },
          verify: {
            type: 'provider',
            verifierId: 'zoom.delivery.v1',
            allowedSecretRefs: ['zoom_secret_token'],
            allowedBootstrapCaptureRefs: []
          },
          result: { type: 'dispatch', scope: 'receiver_trigger' },
          replay: {
            kind: 'enforced',
            freshness: {
              source: 'preset',
              presetField: 'timestamp',
              format: 'unix_seconds',
              maxAgeSeconds: 300,
              maxFutureSkewSeconds: 30
            },
            deduplicate: {
              source: 'preset',
              presetField: 'event_id',
              ttlSeconds: 604_800,
              scope: 'request'
            }
          }
        }
      ]
    }
  }
} satisfies SlateWebhookHttpOptions;

let parseBody = (request: WebhookWireRequest) => {
  let body = decodeWebhookWireBody(request.body);
  if (body === null) return null;
  try {
    let value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { body, value: value as Record<string, any> }
      : null;
  } catch {
    return null;
  }
};

export let verifyZoomWebhook = async (ctx: {
  input: { ruleId: string; originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let parsed = parseBody(ctx.input.originalRequest);
  let secret = ctx.secrets.zoom_secret_token?.value;
  if (!parsed || !secret)
    return { status: 'rejected' as const, code: 'credential_missing' as const };

  if (ctx.input.ruleId === 'zoom.bootstrap.v1') {
    return parsed.value.event === 'endpoint.url_validation' &&
      typeof parsed.value.payload?.plainToken === 'string' &&
      parsed.value.payload.plainToken.length > 0
      ? { status: 'accepted' as const, selection: { scope: 'receiver_trigger' as const } }
      : { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  }

  let timestamps = getWebhookHeaderValues(ctx.input.originalRequest, 'x-zm-request-timestamp');
  let signatures = getWebhookHeaderValues(ctx.input.originalRequest, 'x-zm-signature');
  if (timestamps.length !== 1 || signatures.length !== 1 || !/^\d+$/.test(timestamps[0]!)) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  let rawBody = Buffer.from(parsed.body);
  if (
    !verifyHmacSignature({
      secret,
      payload: Buffer.from(`v0:${timestamps[0]}:${rawBody.toString('utf8')}`, 'utf8'),
      signature: signatures[0]!.trim(),
      digest: 'hex',
      prefix: 'v0='
    })
  ) {
    return { status: 'rejected' as const, code: 'credential_invalid' as const };
  }
  return {
    status: 'accepted' as const,
    selection: { scope: 'receiver_trigger' as const },
    authenticatedFields: {
      timestamp: timestamps[0]!,
      event_id: createHash('sha256').update(rawBody).digest('hex')
    }
  };
};

export let captureZoomWebhookBootstrap = async (ctx: {
  input: { originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let parsed = parseBody(ctx.input.originalRequest);
  let plainToken = parsed?.value.payload?.plainToken;
  let secret = ctx.secrets.zoom_secret_token?.value;
  if (typeof plainToken !== 'string' || plainToken.length === 0 || !secret) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  return {
    status: 'accepted' as const,
    capturedSecrets: {},
    response: {
      status: 200,
      headers: [['content-type', 'application/json']] as [string, string][],
      body: {
        present: true as const,
        base64: Buffer.from(
          JSON.stringify({
            plainToken,
            encryptedToken: createHmacSignature({
              secret,
              payload: plainToken,
              digest: 'hex'
            })
          }),
          'utf8'
        ).toString('base64')
      }
    }
  };
};
