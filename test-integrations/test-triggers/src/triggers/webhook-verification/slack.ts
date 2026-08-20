import { createHash } from 'node:crypto';
import {
  SlateTrigger,
  type SlateWebhookHttpOptions,
  type SlateWebhookRuleRequestMatcher,
  type SlateWebhookSecretRef,
  type SlateWebhookVerificationRule
} from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import {
  mapWebhookVerificationPayload,
  registerWebhookVerificationCredential,
  TEST_HMAC_SECRET,
  webhookVerificationEchoSchema
} from './shared';

type RegistrationSecretRef = Extract<SlateWebhookSecretRef, { source: 'registration' }>;

let slackRequestFamilies = [
  'events_api',
  'interactivity',
  'slash_command',
  'ssl_check'
] as const;

let slackInteractionTypes = new Set([
  'block_actions',
  'shortcut',
  'message_action',
  'view_submission',
  'view_closed',
  'block_suggestion'
]);

export let slackWebhookVerificationSchema = webhookVerificationEchoSchema.extend({
  slack: z.object({
    requestFamily: z.enum(slackRequestFamilies),
    payloadType: z.string(),
    sourceId: z.string(),
    rawBodySha256: z.string(),
    retry: z
      .object({
        number: z.number(),
        reason: z.string().optional()
      })
      .nullable()
  })
});

type SlackWebhookVerificationInput = z.infer<typeof slackWebhookVerificationSchema>;
type SlackRequestFamily = SlackWebhookVerificationInput['slack']['requestFamily'];

export let slackHmacSecretRef: RegistrationSecretRef = {
  source: 'registration',
  name: 'hmac_secret',
  registrationKey: 'hmacSecret',
  encoding: 'utf8'
};

let slackFreshness = {
  source: 'preset',
  presetField: 'timestamp',
  format: 'unix_seconds',
  maxAgeSeconds: 300,
  maxFutureSkewSeconds: 60
} as const;

let createSlackHttp = (
  syncMatcher: SlateWebhookRuleRequestMatcher | null,
  rules: [SlateWebhookVerificationRule, ...SlateWebhookVerificationRule[]]
): SlateWebhookHttpOptions => ({
  methods: ['POST'],
  ...(syncMatcher
    ? {
        sync: {
          mode: 'match' as const,
          match: [syncMatcher],
          timeoutMs: 1500
        }
      }
    : {}),
  ingress: {
    kind: 'receiver_route',
    baseline: 'receiver_path_secret',
    verification: {
      mechanism: 'hub',
      baseline: 'receiver_path_secret',
      allowedSecretRefs: [slackHmacSecretRef],
      rules
    }
  }
});

let eventsSyncMatcher = {
  jsonBodyField: { path: 'type', equals: 'url_verification' }
} as const;

let eventsRuleMatcher = {
  jsonBodyField: { path: '/type', equals: 'url_verification' }
} as const;

let interactivityMatcher = {
  formBodyField: { path: 'payload' }
} as const;

let slashCommandMatcher = {
  formBodyField: { path: 'command' }
} as const;

let sslCheckMatcher = {
  formBodyField: { path: 'ssl_check', equals: '1' }
} as const;

let slackEventsHttp = createSlackHttp(eventsSyncMatcher, [
  {
    id: 'slack.url_verification.v1',
    phase: 'bootstrap',
    when: {
      methods: ['POST'],
      matcher: eventsRuleMatcher
    },
    verify: { type: 'preset', preset: 'slack.v0' },
    result: { type: 'sync_only' },
    replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
  },
  {
    id: 'slack.event_callback.v1',
    phase: 'delivery',
    when: {
      methods: ['POST'],
      matcher: { jsonBodyField: { path: '/type', equals: 'event_callback' } }
    },
    verify: { type: 'preset', preset: 'slack.v0' },
    result: { type: 'dispatch', scope: 'receiver_trigger' },
    replay: {
      kind: 'enforced',
      freshness: slackFreshness,
      deduplicate: {
        source: 'json_pointer',
        pointer: '/event_id',
        ttlSeconds: 604_800,
        scope: 'request'
      }
    }
  },
  {
    id: 'slack.app_rate_limited.v1',
    phase: 'delivery',
    when: {
      methods: ['POST'],
      matcher: { jsonBodyField: { path: '/type', equals: 'app_rate_limited' } }
    },
    verify: { type: 'preset', preset: 'slack.v0' },
    result: { type: 'dispatch', scope: 'receiver_trigger' },
    replay: {
      kind: 'enforced',
      freshness: slackFreshness
    }
  }
]);

let slackInteractivityHttp = createSlackHttp(null, [
  {
    id: 'slack.interactivity.v1',
    phase: 'delivery',
    when: {
      methods: ['POST'],
      matcher: interactivityMatcher
    },
    verify: { type: 'preset', preset: 'slack.v0' },
    result: { type: 'dispatch', scope: 'receiver_trigger' },
    replay: {
      kind: 'enforced',
      freshness: slackFreshness
    }
  }
]);

let slackSlashCommandHttp = createSlackHttp(null, [
  {
    id: 'slack.slash_command.v1',
    phase: 'delivery',
    when: {
      methods: ['POST'],
      matcher: slashCommandMatcher
    },
    verify: { type: 'preset', preset: 'slack.v0' },
    result: { type: 'dispatch', scope: 'receiver_trigger' },
    replay: {
      kind: 'enforced',
      freshness: slackFreshness
    }
  }
]);

let slackSslCheckHttp = createSlackHttp(null, [
  {
    id: 'slack.ssl_check.v1',
    phase: 'bootstrap',
    when: {
      methods: ['POST'],
      matcher: sslCheckMatcher
    },
    verify: { type: 'preset', preset: 'slack.v0' },
    result: { type: 'sync_only' },
    replay: { kind: 'not_applicable', reason: 'bootstrap_sync_only' }
  }
]);

type ReadSlackRequest = {
  bodyText: string | null;
  rawBodySha256: string;
};

let readSlackRequest = async (request: Request): Promise<ReadSlackRequest> => {
  let bytes = new Uint8Array(await request.arrayBuffer());
  let rawBodySha256 = createHash('sha256').update(bytes).digest('hex');
  try {
    return {
      bodyText: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      rawBodySha256
    };
  } catch {
    return { bodyText: null, rawBodySha256 };
  }
};

let parseJsonObject = (value: string): Record<string, unknown> | null => {
  try {
    let parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

type StrictForm = [name: string, value: string][];

let decodeFormComponent = (value: string): string | null => {
  let bytes: number[] = [];
  let encoder = new TextEncoder();

  for (let index = 0; index < value.length; ) {
    let character = value[index]!;
    if (character === '%') {
      let encodedByte = value.slice(index + 1, index + 3);
      if (encodedByte.length !== 2 || !/^[0-9A-Fa-f]{2}$/.test(encodedByte)) return null;
      bytes.push(Number.parseInt(encodedByte, 16));
      index += 3;
      continue;
    }
    if (character === '+') {
      bytes.push(0x20);
      index += 1;
      continue;
    }

    let codePoint = value.codePointAt(index);
    if (codePoint === undefined) return null;
    let literal = String.fromCodePoint(codePoint);
    bytes.push(...encoder.encode(literal));
    index += literal.length;
  }

  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      Uint8Array.from(bytes)
    );
  } catch {
    return null;
  }
};

let parseForm = (value: string | null): StrictForm | null => {
  if (value === null) return null;
  let fields: StrictForm = [];

  for (let encodedField of value.split('&')) {
    if (encodedField.length === 0) continue;
    let separatorIndex = encodedField.indexOf('=');
    let encodedName =
      separatorIndex === -1 ? encodedField : encodedField.slice(0, separatorIndex);
    let encodedValue = separatorIndex === -1 ? '' : encodedField.slice(separatorIndex + 1);
    let name = decodeFormComponent(encodedName);
    let fieldValue = decodeFormComponent(encodedValue);
    if (name === null || fieldValue === null) return null;
    fields.push([name, fieldValue]);
  }

  return fields;
};

let getFormValues = (form: StrictForm | null, name: string) =>
  form?.filter(([fieldName]) => fieldName === name).map(([, value]) => value) ?? [];

let parseRetry = (headers: Headers) => {
  let rawNumber = headers.get('x-slack-retry-num');
  if (rawNumber === null || !/^\d+$/.test(rawNumber)) return null;
  let number = Number(rawNumber);
  if (!Number.isSafeInteger(number) || number < 0) return null;

  let reason = headers.get('x-slack-retry-reason');
  return {
    number,
    ...(reason !== null && reason.length > 0 ? { reason } : {})
  };
};

let createSlackInput = (d: {
  request: Request;
  payload: Record<string, unknown>;
  requestFamily: SlackRequestFamily;
  payloadType: string;
  sourceId: string;
  rawBodySha256: string;
}): SlackWebhookVerificationInput => ({
  ...mapWebhookVerificationPayload(d.request, d.payload),
  slack: {
    requestFamily: d.requestFamily,
    payloadType: d.payloadType,
    sourceId: d.sourceId,
    rawBodySha256: d.rawBodySha256,
    retry: parseRetry(d.request.headers)
  }
});

let readNonemptyString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

let readRateLimitMinute = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return readNonemptyString(value);
};

let handleSlackEventsRequest = async (request: Request) => {
  let { bodyText, rawBodySha256 } = await readSlackRequest(request);
  if (bodyText === null) return { inputs: [] };
  let payload = parseJsonObject(bodyText);
  if (!payload) return { inputs: [] };

  if (payload.type === 'url_verification') {
    return { inputs: [] };
  }

  if (payload.type === 'event_callback') {
    let sourceId = readNonemptyString(payload.event_id);
    if (!sourceId) return { inputs: [] };
    return {
      inputs: [
        createSlackInput({
          request,
          payload,
          requestFamily: 'events_api',
          payloadType: 'event_callback',
          sourceId,
          rawBodySha256
        })
      ]
    };
  }

  if (payload.type === 'app_rate_limited') {
    let teamId = readNonemptyString(payload.team_id);
    let minuteRateLimited = readRateLimitMinute(payload.minute_rate_limited);
    if (!teamId || !minuteRateLimited) return { inputs: [] };
    return {
      inputs: [
        createSlackInput({
          request,
          payload,
          requestFamily: 'events_api',
          payloadType: 'app_rate_limited',
          sourceId: `${teamId}:${minuteRateLimited}`,
          rawBodySha256
        })
      ]
    };
  }

  return { inputs: [] };
};

let handleSlackInteractivityRequest = async (request: Request) => {
  let { bodyText, rawBodySha256 } = await readSlackRequest(request);
  let params = parseForm(bodyText);
  let payloadFields = getFormValues(params, 'payload');
  let payload = payloadFields.length === 1 ? parseJsonObject(payloadFields[0]!) : null;
  let payloadType = payload ? readNonemptyString(payload.type) : null;
  if (!payload || !payloadType || !slackInteractionTypes.has(payloadType)) {
    return { inputs: [] };
  }

  return {
    inputs: [
      createSlackInput({
        request,
        payload,
        requestFamily: 'interactivity',
        payloadType,
        sourceId: rawBodySha256,
        rawBodySha256
      })
    ]
  };
};

let handleSlackSlashCommandRequest = async (request: Request) => {
  let { bodyText, rawBodySha256 } = await readSlackRequest(request);
  let params = parseForm(bodyText);
  let commands = getFormValues(params, 'command');
  let command = commands.length === 1 ? readNonemptyString(commands[0]) : null;
  if (!params || !command) return { inputs: [] };

  return {
    inputs: [
      createSlackInput({
        request,
        payload: Object.fromEntries(params),
        requestFamily: 'slash_command',
        payloadType: 'slash_command',
        sourceId: rawBodySha256,
        rawBodySha256
      })
    ]
  };
};

let handleSlackSslCheckRequest = async (request: Request) => {
  let { bodyText } = await readSlackRequest(request);
  parseForm(bodyText);
  return { inputs: [] };
};

let mapSlackEvent = (triggerKey: string, input: SlackWebhookVerificationInput) => ({
  type: `test.webhook.${triggerKey}`,
  id: `${triggerKey}:${input.slack.requestFamily}:${input.slack.payloadType}:${input.slack.sourceId}`,
  output: input
});

let autoRegisterSlackWebhook = async (ctx: {
  input: { capturedSecretVersions: Readonly<Record<string, number>> };
}) =>
  registerWebhookVerificationCredential(ctx.input.capturedSecretVersions, {
    name: slackHmacSecretRef.name,
    value: TEST_HMAC_SECRET
  });

let createSlackAction = (d: {
  key: string;
  name: string;
  description: string;
  http: SlateWebhookHttpOptions;
  handleRequest: (request: Request) => Promise<{
    inputs: SlackWebhookVerificationInput[];
  }>;
}) =>
  SlateTrigger.create(spec, {
    key: d.key,
    name: d.name,
    description: d.description,
    eventTypes: [`test.webhook.${d.key}`]
  })
    .input(slackWebhookVerificationSchema)
    .output(slackWebhookVerificationSchema)
    .webhook({
      http: d.http,
      handleRequest: async ctx => d.handleRequest(ctx.request),
      handleEvent: async ctx => mapSlackEvent(d.key, ctx.input),
      autoRegisterWebhook: autoRegisterSlackWebhook
    })
    .build();

export let verify_preset_slack_v0 = createSlackAction({
  key: 'verify_preset_slack_v0',
  name: 'Verify Preset slack.v0 Events API',
  description: 'Receives Slack Events API callbacks authenticated by the slack.v0 Hub preset.',
  http: slackEventsHttp,
  handleRequest: handleSlackEventsRequest
});

export let verify_slack_interactivity_v0 = createSlackAction({
  key: 'verify_slack_interactivity_v0',
  name: 'Verify Slack Interactivity v0',
  description:
    'Receives Slack interactivity callbacks authenticated by the slack.v0 Hub preset.',
  http: slackInteractivityHttp,
  handleRequest: handleSlackInteractivityRequest
});

export let verify_slack_slash_command_v0 = createSlackAction({
  key: 'verify_slack_slash_command_v0',
  name: 'Verify Slack Slash Command v0',
  description: 'Receives Slack slash commands authenticated by the slack.v0 Hub preset.',
  http: slackSlashCommandHttp,
  handleRequest: handleSlackSlashCommandRequest
});

export let verify_slack_ssl_check_v0 = createSlackAction({
  key: 'verify_slack_ssl_check_v0',
  name: 'Verify Slack SSL Check v0',
  description: 'Receives Slack SSL checks authenticated by the slack.v0 Hub preset.',
  http: slackSslCheckHttp,
  handleRequest: handleSlackSslCheckRequest
});

export let verifyPresetSlackV0 = verify_preset_slack_v0;
export let verifySlackInteractivityV0 = verify_slack_interactivity_v0;
export let verifySlackSlashCommandV0 = verify_slack_slash_command_v0;
export let verifySlackSslCheckV0 = verify_slack_ssl_check_v0;

export let supplementarySlackVerificationActions = [
  verify_slack_interactivity_v0,
  verify_slack_slash_command_v0,
  verify_slack_ssl_check_v0
];
