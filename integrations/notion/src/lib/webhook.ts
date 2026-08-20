import {
  decodeWebhookWireBody,
  getWebhookHeaderValues,
  type SlateWebhookHttpOptions,
  type SlateWebhookHttpResponseInit,
  verifyHmacSignature
} from 'slates';

export let notionWebhookHttp = {
  registration: { mode: 'manual_bootstrap' },
  methods: ['POST'],
  sync: {
    mode: 'match',
    match: [{ jsonBodyField: { path: 'verification_token' } }]
  },
  ingress: {
    kind: 'receiver_route',
    baseline: 'receiver_path_secret',
    verification: {
      mechanism: 'provider',
      baseline: 'receiver_path_secret',
      reason: 'Notion requires generation-bound token capture before signed delivery.',
      allowedSecretRefs: [
        {
          source: 'registration',
          name: 'notion_verification_token',
          registrationKey: 'verificationToken',
          encoding: 'utf8'
        }
      ],
      rules: [
        {
          id: 'notion.bootstrap.v1',
          phase: 'bootstrap',
          when: {
            methods: ['POST'],
            registrationStatuses: ['pending', 'registering'],
            matcher: { jsonBodyField: { path: '/verification_token' } }
          },
          verify: {
            type: 'provider',
            verifierId: 'notion.delivery.v1',
            allowedSecretRefs: [],
            allowedBootstrapCaptureRefs: ['notion_verification_token']
          },
          result: { type: 'sync_only' },
          replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
        },
        {
          id: 'notion.delivery.v1',
          phase: 'delivery',
          when: { methods: ['POST'], registrationStatuses: ['registered', 'renewing'] },
          verify: {
            type: 'provider',
            verifierId: 'notion.delivery.v1',
            allowedSecretRefs: ['notion_verification_token'],
            allowedBootstrapCaptureRefs: []
          },
          result: { type: 'dispatch', scope: 'receiver_trigger' },
          replay: {
            kind: 'enforced',
            deduplicate: {
              source: 'json_pointer',
              pointer: '/id',
              ttlSeconds: 604_800,
              scope: 'request'
            }
          }
        }
      ]
    }
  }
} satisfies SlateWebhookHttpOptions;

let parseExactJson = (body: Parameters<typeof decodeWebhookWireBody>[0]) => {
  let bytes = decodeWebhookWireBody(body);
  if (bytes === null) return null;
  try {
    let parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    return null;
  }
};

export let verifyNotionWebhook = async (ctx: {
  input: {
    ruleId: string;
    originalRequest: {
      headers: [string, string][];
      body: Parameters<typeof decodeWebhookWireBody>[0];
    };
  };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let body = parseExactJson(ctx.input.originalRequest.body);
  if (!body) return { status: 'rejected' as const, code: 'wire_input_malformed' as const };
  if (ctx.input.ruleId === 'notion.bootstrap.v1') {
    return typeof body.verification_token === 'string' && body.verification_token.length > 0
      ? { status: 'accepted' as const, selection: { scope: 'receiver_trigger' as const } }
      : { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  let token = ctx.secrets.notion_verification_token?.value;
  let signatures = getWebhookHeaderValues(
    ctx.input.originalRequest as Parameters<typeof getWebhookHeaderValues>[0],
    'x-notion-signature'
  );
  let raw = decodeWebhookWireBody(ctx.input.originalRequest.body);
  if (!token || signatures.length !== 1 || raw === null) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  return verifyHmacSignature({
    secret: token,
    payload: Buffer.from(raw),
    signature: signatures[0]!.trim(),
    digest: 'hex',
    prefix: 'sha256='
  })
    ? { status: 'accepted' as const, selection: { scope: 'receiver_trigger' as const } }
    : { status: 'rejected' as const, code: 'credential_invalid' as const };
};

export let captureNotionWebhookBootstrap = async (ctx: {
  input: {
    registrationVersion: number;
    originalRequest: { body: Parameters<typeof decodeWebhookWireBody>[0] };
  };
}) => {
  let body = parseExactJson(ctx.input.originalRequest.body);
  let token = body?.verification_token;
  if (typeof token !== 'string' || token.length === 0) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  return {
    status: 'accepted' as const,
    capturedSecrets: {
      notion_verification_token: { value: token, version: ctx.input.registrationVersion }
    },
    response: {
      status: 200,
      headers: [],
      body: { present: true as const, base64: '' }
    }
  };
};

export type NotionWebhookRequestResult =
  | {
      type: 'complete';
      result: {
        inputs: never[];
        response?: SlateWebhookHttpResponseInit;
      };
    }
  | { type: 'events'; events: any[] };

/** Parses only after the Hub has authenticated and, where applicable, captured the request. */
export let handleNotionWebhookRequest = async (ctx: {
  request: Request;
}): Promise<NotionWebhookRequestResult> => {
  let rawBody = await ctx.request.text();
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { type: 'complete', result: { inputs: [] } };
  }
  if (body === null || typeof body !== 'object') {
    return { type: 'complete', result: { inputs: [] } };
  }
  if (typeof body.verification_token === 'string') {
    return { type: 'complete', result: { inputs: [], response: { status: 200 } } };
  }

  let events: any[] = [];
  if (body.type && body.entity) events.push(body);
  else if (Array.isArray(body.events)) events = body.events;
  else if (body.event) events.push(body.event);
  return { type: 'events', events };
};
