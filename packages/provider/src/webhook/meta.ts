import { createHash, timingSafeEqual } from 'node:crypto';
import type {
  SlateTriggerWebhookBootstrapCaptureHandler,
  SlateTriggerWebhookVerifyHandler,
  SlateWebhookHttpOptions,
  WebhookWireRequest
} from '../action';
import { verifyHmacSignature } from '../crypto';
import { decodeWebhookWireBody, getWebhookHeaderValues } from './verification';

export let metaWebhookHttp = {
  registration: { mode: 'manual_bootstrap' },
  methods: ['GET', 'POST'],
  sync: {
    mode: 'match',
    match: [{ method: 'GET', hasQueryParam: 'hub.mode' }]
  },
  ingress: {
    kind: 'receiver_route',
    baseline: 'receiver_path_secret',
    verification: {
      mechanism: 'provider',
      baseline: 'receiver_path_secret',
      reason:
        'Meta bootstrap and delivery credentials are projected only into scoped pre-dispatch verification.',
      allowedSecretRefs: [
        {
          source: 'config',
          name: 'meta_verify_token',
          configKey: 'webhookVerifyToken',
          encoding: 'utf8'
        },
        {
          source: 'config',
          name: 'meta_app_secret',
          configKey: 'webhookAppSecret',
          encoding: 'utf8'
        }
      ],
      rules: [
        {
          id: 'meta.bootstrap.v1',
          phase: 'bootstrap',
          when: {
            methods: ['GET'],
            registrationStatuses: ['pending', 'registering'],
            matcher: { method: 'GET', hasQueryParam: 'hub.mode' }
          },
          verify: {
            type: 'provider',
            verifierId: 'meta.delivery.v1',
            allowedSecretRefs: ['meta_verify_token'],
            allowedBootstrapCaptureRefs: []
          },
          result: { type: 'sync_only' },
          replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
        },
        {
          id: 'meta.delivery.v1',
          phase: 'delivery',
          when: {
            methods: ['POST'],
            registrationStatuses: ['registered', 'renewing']
          },
          verify: {
            type: 'provider',
            verifierId: 'meta.delivery.v1',
            allowedSecretRefs: ['meta_app_secret'],
            allowedBootstrapCaptureRefs: []
          },
          result: { type: 'dispatch', scope: 'receiver_trigger' },
          replay: {
            kind: 'enforced',
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

let safeEqual = (first: string, second: string) => {
  let firstBytes = Buffer.from(first, 'utf8');
  let secondBytes = Buffer.from(second, 'utf8');
  return firstBytes.length === secondBytes.length && timingSafeEqual(firstBytes, secondBytes);
};

let readBootstrap = (request: WebhookWireRequest) => {
  let url = new URL(request.url);
  let modes = url.searchParams.getAll('hub.mode');
  let tokens = url.searchParams.getAll('hub.verify_token');
  let challenges = url.searchParams.getAll('hub.challenge');
  if (
    request.method !== 'GET' ||
    modes.length !== 1 ||
    modes[0] !== 'subscribe' ||
    tokens.length !== 1 ||
    challenges.length !== 1 ||
    challenges[0]!.length === 0
  ) {
    return null;
  }
  return { token: tokens[0]!, challenge: challenges[0]! };
};

export let verifyMetaWebhook = (async (ctx: {
  input: { ruleId: string; originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}): Promise<Awaited<ReturnType<SlateTriggerWebhookVerifyHandler>>> => {
  if (ctx.input.ruleId === 'meta.bootstrap.v1') {
    let bootstrap = readBootstrap(ctx.input.originalRequest);
    let expected = ctx.secrets.meta_verify_token?.value;
    if (!bootstrap || !expected) return { status: 'rejected', code: 'credential_missing' };
    return safeEqual(bootstrap.token, expected)
      ? { status: 'accepted', selection: { scope: 'receiver_trigger' } }
      : { status: 'rejected', code: 'credential_invalid' };
  }

  let rawBody = decodeWebhookWireBody(ctx.input.originalRequest.body);
  let signatures = getWebhookHeaderValues(ctx.input.originalRequest, 'x-hub-signature-256');
  let secret = ctx.secrets.meta_app_secret?.value;
  if (rawBody === null || signatures.length !== 1 || !secret) {
    return { status: 'rejected', code: 'credential_missing' };
  }
  if (
    !verifyHmacSignature({
      secret,
      payload: rawBody,
      signature: signatures[0]!.trim(),
      digest: 'hex',
      prefix: 'sha256='
    })
  ) {
    return { status: 'rejected', code: 'credential_invalid' };
  }
  return {
    status: 'accepted',
    selection: { scope: 'receiver_trigger' },
    authenticatedFields: {
      event_id: createHash('sha256').update(rawBody).digest('hex')
    }
  };
}) satisfies SlateTriggerWebhookVerifyHandler;

export let captureMetaWebhookBootstrap = (async (ctx: {
  input: { originalRequest: WebhookWireRequest };
}): Promise<Awaited<ReturnType<SlateTriggerWebhookBootstrapCaptureHandler>>> => {
  let bootstrap = readBootstrap(ctx.input.originalRequest);
  if (!bootstrap) return { status: 'rejected', code: 'wire_input_malformed' };
  return {
    status: 'accepted',
    capturedSecrets: {},
    response: {
      status: 200,
      headers: [['content-type', 'text/plain']],
      body: {
        present: true,
        base64: Buffer.from(bootstrap.challenge, 'utf8').toString('base64')
      }
    }
  };
}) satisfies SlateTriggerWebhookBootstrapCaptureHandler;
