import {
  createHash,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign as signEd25519
} from 'node:crypto';
import {
  SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS,
  type SlateWebhookProviderVerifierId
} from '@slates/proto';
import { type SlateWebhookPresetId, slateWebhookPresetIds } from 'slates';
import {
  getTestGraphClientState,
  getTestGraphSubscriptionId,
  TEST_GRAPH_RESOURCE
} from '../triggers/webhook-verification/graph';
import { getPresetVerificationActionKey } from '../triggers/webhook-verification/presets';
import { getProviderBoundaryActionKey } from '../triggers/webhook-verification/providers';
import {
  TEST_ED25519_PRIVATE_SEED_HEX,
  TEST_HMAC_SECRET,
  TEST_PROVIDER_TOKEN,
  TEST_STATIC_TOKEN
} from '../triggers/webhook-verification/shared';

let CORE_WEBHOOK_TEST_TRIGGER_KEYS = [
  'verify_static_header',
  'verify_static_query',
  'verify_static_json',
  'verify_raw_hmac',
  'verify_ed25519'
] as const;

let SUPPLEMENTARY_SLACK_WEBHOOK_TEST_TRIGGER_KEYS = [
  'verify_slack_interactivity_v0',
  'verify_slack_slash_command_v0',
  'verify_slack_ssl_check_v0'
] as const;

type NormalizeWebhookId<Id extends string> = Id extends `${infer Head}.${infer Tail}`
  ? `${Head}_${NormalizeWebhookId<Tail>}`
  : Id;

type CoreWebhookTestTriggerKey = (typeof CORE_WEBHOOK_TEST_TRIGGER_KEYS)[number];
type PresetWebhookTestTriggerKey = `verify_preset_${NormalizeWebhookId<SlateWebhookPresetId>}`;
type ProviderWebhookTestTriggerKey =
  `verify_provider_${NormalizeWebhookId<SlateWebhookProviderVerifierId>}`;
type SupplementarySlackWebhookTestTriggerKey =
  (typeof SUPPLEMENTARY_SLACK_WEBHOOK_TEST_TRIGGER_KEYS)[number];
type DeclaredSlackWebhookTestTriggerKey =
  | 'verify_preset_slack_v0'
  | SupplementarySlackWebhookTestTriggerKey;

export let SLACK_WEBHOOK_TEST_CASES_BY_TRIGGER_KEY = {
  verify_preset_slack_v0: [
    'url-verification',
    'event-callback',
    'event-retry',
    'app-rate-limited'
  ],
  verify_slack_interactivity_v0: [
    'block-actions',
    'shortcut',
    'message-action',
    'view-submission',
    'view-closed',
    'block-suggestion'
  ],
  verify_slack_slash_command_v0: ['slash-command'],
  verify_slack_ssl_check_v0: ['ssl-check']
} as const satisfies Record<DeclaredSlackWebhookTestTriggerKey, readonly string[]>;

export type SlackWebhookTestTriggerKey = keyof typeof SLACK_WEBHOOK_TEST_CASES_BY_TRIGGER_KEY;
export type SlackWebhookTestCaseForTriggerKey<TriggerKey extends SlackWebhookTestTriggerKey> =
  (typeof SLACK_WEBHOOK_TEST_CASES_BY_TRIGGER_KEY)[TriggerKey][number];
export type SlackWebhookTestCase =
  SlackWebhookTestCaseForTriggerKey<SlackWebhookTestTriggerKey>;

export type WebhookTestTriggerKey =
  | CoreWebhookTestTriggerKey
  | PresetWebhookTestTriggerKey
  | SupplementarySlackWebhookTestTriggerKey
  | ProviderWebhookTestTriggerKey;

export let SLACK_WEBHOOK_TEST_CASES = Object.freeze(
  Object.values(SLACK_WEBHOOK_TEST_CASES_BY_TRIGGER_KEY).flat()
) as readonly SlackWebhookTestCase[];

export let DEFAULT_SLACK_WEBHOOK_TEST_CASE_BY_TRIGGER_KEY = {
  verify_preset_slack_v0: 'event-callback',
  verify_slack_interactivity_v0: 'block-actions',
  verify_slack_slash_command_v0: 'slash-command',
  verify_slack_ssl_check_v0: 'ssl-check'
} as const satisfies {
  [TriggerKey in SlackWebhookTestTriggerKey]: SlackWebhookTestCaseForTriggerKey<TriggerKey>;
};

type WebhookTestRequestBaseOptions = {
  invalid?: boolean;
  now?: number | Date;
  eventId?: string;
  graphAuthorityVersion?: number;
};

type WebhookTestRequestOptionsForSingleTrigger<TriggerKey extends WebhookTestTriggerKey> =
  TriggerKey extends SlackWebhookTestTriggerKey
    ? WebhookTestRequestBaseOptions & {
        slackCase?: SlackWebhookTestCaseForTriggerKey<TriggerKey>;
      }
    : WebhookTestRequestBaseOptions & { slackCase?: never };

export type WebhookTestRequestOptions<
  TriggerKey extends WebhookTestTriggerKey = WebhookTestTriggerKey
> = [TriggerKey] extends [SlackWebhookTestTriggerKey]
  ? WebhookTestRequestBaseOptions & {
      slackCase?: SlackWebhookTestCaseForTriggerKey<
        Extract<TriggerKey, SlackWebhookTestTriggerKey>
      >;
    }
  : TriggerKey extends WebhookTestTriggerKey
    ? WebhookTestRequestOptionsForSingleTrigger<TriggerKey>
    : never;

type AnyWebhookTestRequestOptions = WebhookTestRequestBaseOptions & {
  slackCase?: SlackWebhookTestCase;
};

export type WebhookBootstrapRequestOptions = Omit<WebhookTestRequestBaseOptions, 'invalid'>;

export type SlackWebhookExpectedResponse =
  | { kind: 'accepted' }
  | { kind: 'rejected' }
  | { kind: 'text'; status: 200; contentType: 'text/plain'; body: string }
  | { kind: 'empty'; status: 200 }
  | { kind: 'json'; status: 200; body: { options: [] } };

export type SlackWebhookTestDescriptor = {
  case: SlackWebhookTestCase;
  expectedMappedEventId: string | null;
  expectedResponse: SlackWebhookExpectedResponse;
  responseRedactionLiterals: string[];
};

export type WebhookTestRequestDescriptor = {
  method: 'POST';
  url: string;
  headers: [string, string][];
  body: string | Uint8Array;
  eventId: string;
  expectedOutcome: 'accepted' | 'rejected' | 'sync_only';
  slack?: SlackWebhookTestDescriptor;
};

let PRESET_WEBHOOK_TEST_TRIGGER_KEYS = slateWebhookPresetIds.map(preset =>
  getPresetVerificationActionKey(preset)
) as PresetWebhookTestTriggerKey[];

let PROVIDER_WEBHOOK_TEST_TRIGGER_KEYS = SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS.map(verifierId =>
  getProviderBoundaryActionKey(verifierId)
) as ProviderWebhookTestTriggerKey[];

export let WEBHOOK_TEST_TRIGGER_KEYS = Object.freeze([
  ...CORE_WEBHOOK_TEST_TRIGGER_KEYS,
  ...PRESET_WEBHOOK_TEST_TRIGGER_KEYS,
  ...SUPPLEMENTARY_SLACK_WEBHOOK_TEST_TRIGGER_KEYS,
  ...PROVIDER_WEBHOOK_TEST_TRIGGER_KEYS
]) as readonly WebhookTestTriggerKey[];

let PRESET_BY_TRIGGER_KEY = new Map<WebhookTestTriggerKey, SlateWebhookPresetId>(
  slateWebhookPresetIds.map(preset => [
    getPresetVerificationActionKey(preset) as WebhookTestTriggerKey,
    preset
  ])
);

let PROVIDER_BY_TRIGGER_KEY = new Map<WebhookTestTriggerKey, SlateWebhookProviderVerifierId>(
  SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS.map(verifierId => [
    getProviderBoundaryActionKey(verifierId) as WebhookTestTriggerKey,
    verifierId
  ])
);

type ResolvedRequestOptions = {
  invalid: boolean;
  nowMs: number;
  unixSeconds: number;
  eventId: string;
  graphAuthorityVersion: number;
  slackCase: SlackWebhookTestCase | undefined;
};

let createEventId = () => String(randomBytes(6).readUIntBE(0, 6));

let resolveOptions = (
  options: AnyWebhookTestRequestOptions | undefined
): ResolvedRequestOptions => {
  let nowMs =
    options?.now instanceof Date ? options.now.getTime() : (options?.now ?? Date.now());
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new TypeError('Webhook test request time must be a non-negative integer');
  }
  let eventId = options?.eventId ?? createEventId();
  if (eventId.length === 0) throw new TypeError('Webhook test event ID must not be empty');
  let graphAuthorityVersion = options?.graphAuthorityVersion ?? 1;
  if (!Number.isSafeInteger(graphAuthorityVersion) || graphAuthorityVersion <= 0) {
    throw new TypeError('Graph authority version must be a positive integer');
  }

  return {
    invalid: options?.invalid ?? false,
    nowMs,
    unixSeconds: Math.floor(nowMs / 1000),
    eventId,
    graphAuthorityVersion,
    slackCase: options?.slackCase
  };
};

let callbackUrl = (value: string) => {
  let url = new URL(value);
  url.hash = '';
  return url.toString();
};

let contentTypeHeader = (): [string, string] => ['content-type', 'application/json'];

let jsonBody = (value: unknown) => JSON.stringify(value);

let bodyBytes = (body: string | Uint8Array) =>
  typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body);

let hmac = (message: string | Uint8Array, encoding: 'hex' | 'base64' | 'base64url' = 'hex') =>
  createHmac('sha256', TEST_HMAC_SECRET).update(message).digest(encoding);

let ed25519PrivateKey = () =>
  createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'),
      Buffer.from(TEST_ED25519_PRIVATE_SEED_HEX, 'hex')
    ]),
    format: 'der',
    type: 'pkcs8'
  });

let ed25519Signature = (timestamp: string, body: string | Uint8Array) =>
  signEd25519(
    null,
    Buffer.concat([Buffer.from(timestamp, 'utf8'), bodyBytes(body)]),
    ed25519PrivateKey()
  ).toString('hex');

let corruptCredential = (value: string) => {
  if (value.length === 0) throw new Error('Cannot invalidate empty credential material');
  let first = value[0]!;
  return `${first.toLowerCase() === 'a' ? 'b' : 'a'}${value.slice(1)}`;
};

let signedValue = (valid: string, invalid: boolean) =>
  invalid ? corruptCredential(valid) : valid;

let descriptor = (d: {
  url: string;
  headers?: [string, string][];
  body: string | Uint8Array;
  eventId: string;
  expectedOutcome: WebhookTestRequestDescriptor['expectedOutcome'];
  slack?: SlackWebhookTestDescriptor;
}): WebhookTestRequestDescriptor => ({
  method: 'POST',
  url: d.url,
  headers: d.headers ?? [],
  body: d.body,
  eventId: d.eventId,
  expectedOutcome: d.expectedOutcome,
  ...(d.slack ? { slack: d.slack } : {})
});

let deliveryDescriptor = (
  options: ResolvedRequestOptions,
  d: {
    url: string;
    headers: [string, string][];
    body: string | Uint8Array;
    slack?: SlackWebhookTestDescriptor;
  }
) =>
  descriptor({
    ...d,
    eventId: options.eventId,
    expectedOutcome: options.invalid ? 'rejected' : 'accepted'
  });

let baseEventBody = (eventId: string) => jsonBody({ event_id: eventId });

export let isSlackWebhookTestTriggerKey = (
  triggerKey: WebhookTestTriggerKey
): triggerKey is SlackWebhookTestTriggerKey =>
  triggerKey === 'verify_preset_slack_v0' ||
  (SUPPLEMENTARY_SLACK_WEBHOOK_TEST_TRIGGER_KEYS as readonly string[]).includes(triggerKey);

export let resolveSlackWebhookTestCase = (
  triggerKey: SlackWebhookTestTriggerKey,
  requestedCase?: SlackWebhookTestCase
) => {
  if (
    requestedCase !== undefined &&
    !(SLACK_WEBHOOK_TEST_CASES as readonly string[]).includes(requestedCase)
  ) {
    throw new TypeError(`Unknown Slack case: ${requestedCase}`);
  }
  let slackCase = requestedCase ?? DEFAULT_SLACK_WEBHOOK_TEST_CASE_BY_TRIGGER_KEY[triggerKey];
  let allowedCases = SLACK_WEBHOOK_TEST_CASES_BY_TRIGGER_KEY[triggerKey] as readonly string[];
  if (!allowedCases.includes(slackCase)) {
    throw new TypeError(`Slack case ${slackCase} is not valid for trigger ${triggerKey}`);
  }
  return slackCase;
};

let SLACK_TEAM_ID = 'T0123456789';
let SLACK_APP_ID = 'A0123456789';
let SLACK_USER_ID = 'U0123456789';
let SLACK_CHANNEL_ID = 'C0123456789';
let SLACK_DEPRECATED_TOKEN = 'slack-deprecated-verification-token-v1';
let SLACK_CHALLENGE = 'slack-test-challenge-v1';
let SLACK_TRIGGER_ID = '123456789.987654321.slack-test-trigger';
let SLACK_RESPONSE_URL = 'https://hooks.slack.test/actions/slack-test-response';
let SLACK_BOT_ACCESS_TOKEN = 'xoxb-slack-test-bot-token';
let SLACK_INTERACTIVITY_POINTER = 'slack-test-interactivity-pointer';
let SLACK_INTERACTIVITY_SECRET = 'slack-test-interactivity-secret';

let SLACK_CAPABILITY_REDACTION_LITERALS = [
  SLACK_TRIGGER_ID,
  SLACK_RESPONSE_URL,
  SLACK_BOT_ACCESS_TOKEN,
  SLACK_INTERACTIVITY_POINTER,
  SLACK_INTERACTIVITY_SECRET
];

let slackEventCallbackPayload = (eventId: string, eventTime: number) => ({
  token: SLACK_DEPRECATED_TOKEN,
  team_id: SLACK_TEAM_ID,
  api_app_id: SLACK_APP_ID,
  event: {
    type: 'message',
    user: SLACK_USER_ID,
    text: 'Synthetic Slack webhook test event',
    ts: `${eventTime}.000100`,
    channel: SLACK_CHANNEL_ID,
    event_ts: `${eventTime}.000100`,
    channel_type: 'channel'
  },
  type: 'event_callback',
  event_id: eventId,
  event_time: eventTime,
  trigger_id: SLACK_TRIGGER_ID,
  response_url: SLACK_RESPONSE_URL,
  bot_access_token: SLACK_BOT_ACCESS_TOKEN,
  interactivity_pointer: SLACK_INTERACTIVITY_POINTER,
  interactivity: { interactor: { secret: SLACK_INTERACTIVITY_SECRET } }
});

type SlackInteractionTestCase = Extract<
  SlackWebhookTestCase,
  | 'block-actions'
  | 'shortcut'
  | 'message-action'
  | 'view-submission'
  | 'view-closed'
  | 'block-suggestion'
>;

let slackInteractionPayload = (slackCase: SlackInteractionTestCase) => {
  let common = {
    type: slackCase,
    token: SLACK_DEPRECATED_TOKEN,
    team: { id: SLACK_TEAM_ID },
    user: { id: SLACK_USER_ID },
    api_app_id: SLACK_APP_ID,
    trigger_id: SLACK_TRIGGER_ID,
    response_url: SLACK_RESPONSE_URL,
    bot_access_token: SLACK_BOT_ACCESS_TOKEN,
    interactivity_pointer: SLACK_INTERACTIVITY_POINTER,
    interactivity: { interactor: { secret: SLACK_INTERACTIVITY_SECRET } }
  };
  if (slackCase === 'block-actions') {
    return {
      ...common,
      type: 'block_actions',
      channel: { id: SLACK_CHANNEL_ID },
      container: { type: 'message', channel_id: SLACK_CHANNEL_ID },
      actions: [{ action_id: 'synthetic_action', block_id: 'synthetic_block', value: 'test' }]
    };
  }
  if (slackCase === 'shortcut') {
    return { ...common, type: 'shortcut', callback_id: 'synthetic_shortcut' };
  }
  if (slackCase === 'message-action') {
    return {
      ...common,
      type: 'message_action',
      callback_id: 'synthetic_message_action',
      channel: { id: SLACK_CHANNEL_ID },
      message: { type: 'message', text: 'Synthetic Slack message action' }
    };
  }
  if (slackCase === 'view-submission' || slackCase === 'view-closed') {
    return {
      ...common,
      type: slackCase === 'view-submission' ? 'view_submission' : 'view_closed',
      view: { id: 'V0123456789', type: 'modal', callback_id: 'synthetic_view' }
    };
  }
  return {
    ...common,
    type: 'block_suggestion',
    action_id: 'synthetic_suggestion',
    value: 'syn',
    view: { id: 'V0123456789', type: 'modal', callback_id: 'synthetic_view' }
  };
};

let encodedFormBody = (fields: Record<string, string>) =>
  new URLSearchParams(fields).toString();

let sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

let mappedSlackEventId = (
  triggerKey: SlackWebhookTestTriggerKey,
  family: 'events_api' | 'interactivity' | 'slash_command',
  payloadType: string,
  sourceId: string
) => `${triggerKey}:${family}:${payloadType}:${sourceId}`;

let buildSlackRequest = (
  triggerKey: SlackWebhookTestTriggerKey,
  url: string,
  options: ResolvedRequestOptions
) => {
  let slackCase = resolveSlackWebhookTestCase(triggerKey, options.slackCase);
  let contentType = 'application/json';
  let body: string;
  let extraHeaders: [string, string][] = [];
  let expectedMappedEventId: string | null;
  let expectedResponse: SlackWebhookExpectedResponse;
  let responseRedactionLiterals: string[];

  if (slackCase === 'url-verification') {
    body = jsonBody({
      token: SLACK_DEPRECATED_TOKEN,
      challenge: SLACK_CHALLENGE,
      type: 'url_verification'
    });
    expectedMappedEventId = null;
    expectedResponse = {
      kind: 'text',
      status: 200,
      contentType: 'text/plain',
      body: SLACK_CHALLENGE
    };
    responseRedactionLiterals = [SLACK_DEPRECATED_TOKEN];
  } else if (slackCase === 'event-callback' || slackCase === 'event-retry') {
    body = jsonBody(slackEventCallbackPayload(options.eventId, options.unixSeconds));
    if (slackCase === 'event-retry') {
      extraHeaders = [
        ['x-slack-retry-num', '1'],
        ['x-slack-retry-reason', 'http_timeout']
      ];
    }
    expectedMappedEventId = mappedSlackEventId(
      triggerKey,
      'events_api',
      'event_callback',
      options.eventId
    );
    expectedResponse = { kind: 'accepted' };
    responseRedactionLiterals = [
      SLACK_DEPRECATED_TOKEN,
      ...SLACK_CAPABILITY_REDACTION_LITERALS
    ];
  } else if (slackCase === 'app-rate-limited') {
    let minuteRateLimited = options.unixSeconds - (options.unixSeconds % 60);
    body = jsonBody({
      token: SLACK_DEPRECATED_TOKEN,
      type: 'app_rate_limited',
      team_id: SLACK_TEAM_ID,
      minute_rate_limited: minuteRateLimited,
      api_app_id: SLACK_APP_ID
    });
    expectedMappedEventId = mappedSlackEventId(
      triggerKey,
      'events_api',
      'app_rate_limited',
      `${SLACK_TEAM_ID}:${minuteRateLimited}`
    );
    expectedResponse = { kind: 'accepted' };
    responseRedactionLiterals = [SLACK_DEPRECATED_TOKEN];
  } else if (
    slackCase === 'block-actions' ||
    slackCase === 'shortcut' ||
    slackCase === 'message-action' ||
    slackCase === 'view-submission' ||
    slackCase === 'view-closed' ||
    slackCase === 'block-suggestion'
  ) {
    let payload = slackInteractionPayload(slackCase);
    body = encodedFormBody({ payload: jsonBody(payload) });
    contentType = 'application/x-www-form-urlencoded';
    expectedMappedEventId = mappedSlackEventId(
      triggerKey,
      'interactivity',
      payload.type,
      sha256(body)
    );
    expectedResponse = { kind: 'accepted' };
    responseRedactionLiterals = [
      SLACK_DEPRECATED_TOKEN,
      ...SLACK_CAPABILITY_REDACTION_LITERALS
    ];
  } else if (slackCase === 'slash-command') {
    body = encodedFormBody({
      token: SLACK_DEPRECATED_TOKEN,
      team_id: SLACK_TEAM_ID,
      team_domain: 'synthetic-workspace',
      channel_id: SLACK_CHANNEL_ID,
      channel_name: 'synthetic-channel',
      user_id: SLACK_USER_ID,
      user_name: 'synthetic-user',
      command: '/synthetic-test',
      text: 'deterministic payload',
      api_app_id: SLACK_APP_ID,
      trigger_id: SLACK_TRIGGER_ID,
      response_url: SLACK_RESPONSE_URL,
      bot_access_token: SLACK_BOT_ACCESS_TOKEN,
      interactivity_pointer: SLACK_INTERACTIVITY_POINTER,
      interactivity_secret: SLACK_INTERACTIVITY_SECRET
    });
    contentType = 'application/x-www-form-urlencoded';
    expectedMappedEventId = mappedSlackEventId(
      triggerKey,
      'slash_command',
      'slash_command',
      sha256(body)
    );
    expectedResponse = { kind: 'accepted' };
    responseRedactionLiterals = [
      SLACK_DEPRECATED_TOKEN,
      ...SLACK_CAPABILITY_REDACTION_LITERALS
    ];
  } else {
    body = encodedFormBody({
      ssl_check: '1',
      token: SLACK_DEPRECATED_TOKEN
    });
    contentType = 'application/x-www-form-urlencoded';
    expectedMappedEventId = null;
    expectedResponse = { kind: 'accepted' };
    responseRedactionLiterals = [SLACK_DEPRECATED_TOKEN];
  }

  let timestamp = String(options.unixSeconds);
  let signature = hmac(`v0:${timestamp}:${body}`);
  return deliveryDescriptor(options, {
    url,
    headers: [
      ['content-type', contentType],
      ['x-slack-request-timestamp', timestamp],
      ['x-slack-signature', `v0=${signedValue(signature, options.invalid)}`],
      ...extraHeaders
    ],
    body,
    slack: {
      case: slackCase,
      expectedMappedEventId,
      expectedResponse: options.invalid ? { kind: 'rejected' } : expectedResponse,
      responseRedactionLiterals
    }
  });
};

let numericZoomEventId = (eventId: string) => {
  if (!/^(?:0|[1-9]\d*)$/.test(eventId)) {
    throw new TypeError('Zoom preset event IDs must be decimal integers');
  }
  let numeric = Number(eventId);
  if (!Number.isSafeInteger(numeric)) {
    throw new TypeError('Zoom preset event IDs must be safe integers');
  }
  return numeric;
};

let graphBody = (eventId: string, authorityVersion: number, invalidClientState: boolean) => {
  let clientState = getTestGraphClientState(authorityVersion);
  let suppliedClientState = invalidClientState ? `${clientState}-invalid` : clientState;
  return jsonBody({
    value: [1, 2].map(index => ({
      id: `${eventId}-${index}`,
      subscriptionId: getTestGraphSubscriptionId(authorityVersion),
      clientState: suppliedClientState,
      resource: TEST_GRAPH_RESOURCE
    }))
  });
};

let buildCoreRequest = (
  triggerKey: CoreWebhookTestTriggerKey,
  url: string,
  options: ResolvedRequestOptions
) => {
  let body = baseEventBody(options.eventId);
  if (triggerKey === 'verify_static_header') {
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        [
          'x-test-api-key',
          options.invalid ? `${TEST_STATIC_TOKEN}-invalid` : TEST_STATIC_TOKEN
        ]
      ],
      body
    });
  }
  if (triggerKey === 'verify_static_query') {
    let requestUrl = new URL(url);
    requestUrl.searchParams.delete('api_key');
    requestUrl.searchParams.append(
      'api_key',
      options.invalid ? `${TEST_STATIC_TOKEN}-invalid` : TEST_STATIC_TOKEN
    );
    return deliveryDescriptor(options, {
      url: requestUrl.toString(),
      headers: [contentTypeHeader()],
      body
    });
  }
  if (triggerKey === 'verify_static_json') {
    return deliveryDescriptor(options, {
      url,
      headers: [contentTypeHeader()],
      body: jsonBody({
        event_id: options.eventId,
        api_key: options.invalid ? `${TEST_STATIC_TOKEN}-invalid` : TEST_STATIC_TOKEN
      })
    });
  }
  if (triggerKey === 'verify_raw_hmac') {
    let signature = signedValue(hmac(bodyBytes(body)), options.invalid);
    return deliveryDescriptor(options, {
      url,
      headers: [contentTypeHeader(), ['x-test-signature', signature]],
      body
    });
  }

  let timestamp = String(options.unixSeconds);
  let signature = signedValue(ed25519Signature(timestamp, body), options.invalid);
  return deliveryDescriptor(options, {
    url,
    headers: [
      contentTypeHeader(),
      ['x-test-timestamp', timestamp],
      ['x-test-ed25519-signature', signature]
    ],
    body
  });
};

let decodeHubSpotCanonicalUri = (url: string) => {
  let replacements: Record<string, string> = {
    '3a': ':',
    '2f': '/',
    '3f': '?',
    '40': '@',
    '21': '!',
    '24': '$',
    '27': "'",
    '28': '(',
    '29': ')',
    '2a': '*',
    '2c': ',',
    '3b': ';'
  };
  return url.replace(
    /%([0-9a-fA-F]{2})/g,
    (encoded, hex: string) => replacements[hex.toLowerCase()] ?? encoded.toUpperCase()
  );
};

let jiraEncode = (value: string) =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );

let computeJiraQsh = (method: string, requestUrl: string) => {
  let url = new URL(requestUrl);
  let path = url.pathname
    .split('/')
    .map(segment => jiraEncode(decodeURIComponent(segment)))
    .join('/');
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  let grouped = new Map<string, string[]>();
  for (let [name, value] of url.searchParams.entries()) {
    if (name === 'jwt') continue;
    let values = grouped.get(name) ?? [];
    values.push(value);
    grouped.set(name, values);
  }
  let query = [...grouped.entries()]
    .map(
      ([name, values]) => [jiraEncode(name), values.map(jiraEncode).sort().join(',')] as const
    )
    .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
    .map(([name, values]) => `${name}=${values}`)
    .join('&');

  return createHash('sha256').update(`${method}&${path}&${query}`, 'utf8').digest('hex');
};

let buildJiraRequest = (url: string, body: string, options: ResolvedRequestOptions) => {
  let qsh = computeJiraQsh('POST', url);
  let header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  let payload = Buffer.from(
    JSON.stringify({
      iss: 'test-jira-client-key',
      iat: options.unixSeconds,
      exp: options.unixSeconds + 300,
      qsh,
      webhookId: options.eventId
    })
  ).toString('base64url');
  let signature = signedValue(hmac(`${header}.${payload}`, 'base64url'), options.invalid);
  return deliveryDescriptor(options, {
    url,
    headers: [contentTypeHeader(), ['authorization', `JWT ${header}.${payload}.${signature}`]],
    body
  });
};

let buildPresetRequest = (
  preset: SlateWebhookPresetId,
  url: string,
  options: ResolvedRequestOptions
) => {
  let body = baseEventBody(options.eventId);
  if (preset === 'slack.v0') {
    throw new TypeError('Slack requests must use the specialized Slack request generator');
  }
  if (preset === 'stripe.v1') {
    body = jsonBody({ id: options.eventId });
    let signature = hmac(
      Buffer.concat([Buffer.from(`${options.unixSeconds}.`, 'utf8'), bodyBytes(body)])
    );
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        [
          'stripe-signature',
          `t=${options.unixSeconds},v1=${signedValue(signature, options.invalid)}`
        ]
      ],
      body
    });
  }
  if (preset === 'zoom.v0') {
    body = jsonBody({
      event: 'test.delivery',
      event_ts: numericZoomEventId(options.eventId)
    });
    let timestamp = String(options.unixSeconds);
    let signature = hmac(
      Buffer.concat([Buffer.from(`v0:${timestamp}:`, 'utf8'), bodyBytes(body)])
    );
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        ['x-zm-request-timestamp', timestamp],
        ['x-zm-signature', `v0=${signedValue(signature, options.invalid)}`]
      ],
      body
    });
  }
  if (preset === 'hubspot.v3') {
    let timestamp = String(options.nowMs);
    let signature = hmac(
      Buffer.concat([
        Buffer.from('POST', 'utf8'),
        Buffer.from(decodeHubSpotCanonicalUri(url), 'utf8'),
        bodyBytes(body),
        Buffer.from(timestamp, 'utf8')
      ]),
      'base64'
    );
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        ['x-hubspot-request-timestamp', timestamp],
        ['x-hubspot-signature-v3', signedValue(signature, options.invalid)]
      ],
      body
    });
  }
  if (preset === 'gitlab.standard.v1') {
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        ['x-gitlab-token', options.invalid ? `${TEST_HMAC_SECRET}-invalid` : TEST_HMAC_SECRET],
        ['x-gitlab-event-uuid', options.eventId]
      ],
      body
    });
  }
  if (preset === 'zendesk.v1') {
    let timestamp = new Date(options.nowMs).toISOString();
    let signature = hmac(
      Buffer.concat([Buffer.from(timestamp, 'utf8'), bodyBytes(body)]),
      'base64'
    );
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        ['x-zendesk-webhook-signature-timestamp', timestamp],
        ['x-zendesk-webhook-signature', signedValue(signature, options.invalid)]
      ],
      body
    });
  }
  if (preset === 'typeform.v1') {
    let signature = hmac(bodyBytes(body), 'base64');
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        ['typeform-signature', `sha256=${signedValue(signature, options.invalid)}`]
      ],
      body
    });
  }
  if (preset === 'linear.v1') {
    body = jsonBody({
      webhookId: options.eventId,
      webhookTimestamp: options.nowMs
    });
    let signature = hmac(bodyBytes(body));
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        ['linear-signature', signedValue(signature, options.invalid)]
      ],
      body
    });
  }
  if (preset === 'graph.change_notification.v1') {
    return deliveryDescriptor(options, {
      url,
      headers: [contentTypeHeader()],
      body: graphBody(options.eventId, options.graphAuthorityVersion, options.invalid)
    });
  }
  if (preset === 'jira.oauth_dynamic_webhook.v1') {
    return buildJiraRequest(url, body, options);
  }
  if (preset === 'discord.interactions.v1') {
    let timestamp = String(options.unixSeconds);
    body = jsonBody({ type: 2, id: options.eventId });
    let signature = ed25519Signature(timestamp, body);
    return deliveryDescriptor(options, {
      url,
      headers: [
        contentTypeHeader(),
        ['x-signature-timestamp', timestamp],
        ['x-signature-ed25519', signedValue(signature, options.invalid)]
      ],
      body
    });
  }

  preset satisfies never;
  throw new TypeError(`Unsupported canonical webhook preset: ${preset}`);
};

let buildProviderRequest = (
  verifierId: SlateWebhookProviderVerifierId,
  url: string,
  options: ResolvedRequestOptions
) => {
  let body =
    verifierId === 'braintree.delivery.v1'
      ? jsonBody({ delivery_id: options.eventId })
      : verifierId === 'paypal.delivery.v1'
        ? jsonBody({
            event_id: options.eventId,
            delivery_id: `${options.eventId}-delivery`
          })
        : verifierId === 'zoom.delivery.v1'
          ? jsonBody({
              timestamp: String(options.unixSeconds),
              event_id: options.eventId
            })
          : verifierId === 'graph.change_notification.provider.v1'
            ? graphBody(options.eventId, options.graphAuthorityVersion, false)
            : baseEventBody(options.eventId);

  return deliveryDescriptor(options, {
    url,
    headers: [
      contentTypeHeader(),
      [
        'x-test-provider-token',
        options.invalid ? `${TEST_PROVIDER_TOKEN}-invalid` : TEST_PROVIDER_TOKEN
      ]
    ],
    body
  });
};

export let buildWebhookTestRequest = <TriggerKey extends WebhookTestTriggerKey>(
  triggerKey: TriggerKey,
  callback: string,
  requestOptions?: WebhookTestRequestOptions<NoInfer<TriggerKey>>
): WebhookTestRequestDescriptor => {
  let options = resolveOptions(requestOptions);
  let url = callbackUrl(callback);
  if (isSlackWebhookTestTriggerKey(triggerKey)) {
    return buildSlackRequest(triggerKey, url, options);
  }
  if (options.slackCase !== undefined) {
    throw new TypeError('Slack case is only valid for Slack trigger keys');
  }
  if ((CORE_WEBHOOK_TEST_TRIGGER_KEYS as readonly string[]).includes(triggerKey)) {
    return buildCoreRequest(triggerKey as CoreWebhookTestTriggerKey, url, options);
  }
  let preset = PRESET_BY_TRIGGER_KEY.get(triggerKey);
  if (preset) return buildPresetRequest(preset, url, options);
  let verifierId = PROVIDER_BY_TRIGGER_KEY.get(triggerKey);
  if (verifierId) return buildProviderRequest(verifierId, url, options);
  throw new TypeError(`Unknown webhook test trigger key: ${triggerKey}`);
};

export let buildZoomWebhookBootstrapRequest = (
  callback: string,
  requestOptions?: WebhookBootstrapRequestOptions
) => {
  let options = resolveOptions(requestOptions);
  let body = jsonBody({
    event: 'endpoint.url_validation',
    payload: { plainToken: options.eventId }
  });
  let timestamp = String(options.unixSeconds);
  let signature = hmac(
    Buffer.concat([Buffer.from(`v0:${timestamp}:`, 'utf8'), bodyBytes(body)])
  );
  return descriptor({
    url: callbackUrl(callback),
    headers: [
      contentTypeHeader(),
      ['x-zm-request-timestamp', timestamp],
      ['x-zm-signature', `v0=${signature}`]
    ],
    body,
    eventId: options.eventId,
    expectedOutcome: 'sync_only'
  });
};

export let buildDiscordWebhookBootstrapRequest = (
  callback: string,
  requestOptions?: WebhookBootstrapRequestOptions
) => {
  let options = resolveOptions(requestOptions);
  let body = jsonBody({ type: 1, id: options.eventId });
  let timestamp = String(options.unixSeconds);
  return descriptor({
    url: callbackUrl(callback),
    headers: [
      contentTypeHeader(),
      ['x-signature-timestamp', timestamp],
      ['x-signature-ed25519', ed25519Signature(timestamp, body)]
    ],
    body,
    eventId: options.eventId,
    expectedOutcome: 'sync_only'
  });
};

export let buildGraphWebhookBootstrapRequest = (
  callback: string,
  requestOptions?: WebhookBootstrapRequestOptions
) => {
  let options = resolveOptions(requestOptions);
  let url = new URL(callbackUrl(callback));
  url.searchParams.delete('validationToken');
  url.searchParams.append('validationToken', options.eventId);
  return descriptor({
    url: url.toString(),
    body: '',
    eventId: options.eventId,
    expectedOutcome: 'sync_only'
  });
};
