import { createHash, createHmac, createPrivateKey, sign as signEd25519 } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS } from '@slates/proto';
import { slateWebhookPresetIds } from 'slates';
import { describe, expect, it } from 'vitest';
import {
  getTestGraphClientState,
  getTestGraphSubscriptionId,
  TEST_GRAPH_RESOURCE
} from '../triggers/webhook-verification/graph';
import {
  TEST_ED25519_PRIVATE_SEED_HEX,
  TEST_HMAC_SECRET,
  TEST_PROVIDER_TOKEN,
  TEST_STATIC_TOKEN
} from '../triggers/webhook-verification/shared';
import {
  buildDiscordWebhookBootstrapRequest,
  buildGraphWebhookBootstrapRequest,
  buildWebhookTestRequest,
  buildZoomWebhookBootstrapRequest,
  type SlackWebhookTestCase,
  type SlackWebhookTestTriggerKey,
  WEBHOOK_TEST_TRIGGER_KEYS,
  type WebhookTestRequestDescriptor,
  type WebhookTestTriggerKey
} from './requests';

let NOW_MS = Date.parse('2026-08-18T17:28:45.678Z');
let NOW_SECONDS = Math.floor(NOW_MS / 1000);
let NOW_RFC3339 = new Date(NOW_MS).toISOString();
let EVENT_ID = '170000000012345';
let CALLBACK_URL =
  'https://callbacks.example.test/hooks/a%2Fb?z=last&alpha=two&alpha=one&jwt=ignored';

let _assertTypedWebhookRequestOptions = () => {
  buildWebhookTestRequest('verify_preset_slack_v0', CALLBACK_URL, {
    slackCase: 'event-retry'
  });
  buildWebhookTestRequest('verify_slack_interactivity_v0', CALLBACK_URL, {
    slackCase: 'view-submission'
  });
  buildWebhookTestRequest('verify_slack_slash_command_v0', CALLBACK_URL, {
    slackCase: 'slash-command'
  });
  buildWebhookTestRequest('verify_slack_ssl_check_v0', CALLBACK_URL, {
    slackCase: 'ssl-check'
  });
  buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, { invalid: true });

  buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, {
    // @ts-expect-error Non-Slack triggers do not accept Slack cases.
    slackCase: 'event-callback'
  });
  buildWebhookTestRequest('verify_preset_slack_v0', CALLBACK_URL, {
    // @ts-expect-error Events API triggers do not accept interaction cases.
    slackCase: 'block-actions'
  });
  buildWebhookTestRequest('verify_slack_interactivity_v0', CALLBACK_URL, {
    // @ts-expect-error Interactivity triggers do not accept Events API cases.
    slackCase: 'event-callback'
  });
  buildWebhookTestRequest('verify_slack_slash_command_v0', CALLBACK_URL, {
    // @ts-expect-error Slash-command triggers accept only slash-command.
    slackCase: 'ssl-check'
  });
  buildWebhookTestRequest('verify_slack_ssl_check_v0', CALLBACK_URL, {
    // @ts-expect-error SSL-check triggers accept only ssl-check.
    slackCase: 'slash-command'
  });
};

let EXPECTED_TRIGGER_KEYS = [
  'verify_static_header',
  'verify_static_query',
  'verify_static_json',
  'verify_raw_hmac',
  'verify_ed25519',
  'verify_preset_slack_v0',
  'verify_preset_stripe_v1',
  'verify_preset_zoom_v0',
  'verify_preset_hubspot_v3',
  'verify_preset_gitlab_standard_v1',
  'verify_preset_zendesk_v1',
  'verify_preset_typeform_v1',
  'verify_preset_linear_v1',
  'verify_preset_graph_change_notification_v1',
  'verify_preset_jira_oauth_dynamic_webhook_v1',
  'verify_preset_discord_interactions_v1',
  'verify_slack_interactivity_v0',
  'verify_slack_slash_command_v0',
  'verify_slack_ssl_check_v0',
  'verify_provider_quickbooks_delivery_v1',
  'verify_provider_kofi_delivery_v1',
  'verify_provider_braintree_delivery_v1',
  'verify_provider_paypal_delivery_v1',
  'verify_provider_notion_delivery_v1',
  'verify_provider_asana_delivery_v1',
  'verify_provider_cursor_delivery_v1',
  'verify_provider_google_calendar_delivery_v1',
  'verify_provider_graph_change_notification_provider_v1',
  'verify_provider_meta_delivery_v1',
  'verify_provider_zoom_delivery_v1'
] as const satisfies readonly WebhookTestTriggerKey[];

let build = (key: WebhookTestTriggerKey, invalid = false) =>
  buildWebhookTestRequest(key, CALLBACK_URL, {
    invalid,
    now: NOW_MS,
    eventId: EVENT_ID
  });

let bodyBytes = (descriptor: WebhookTestRequestDescriptor) =>
  typeof descriptor.body === 'string'
    ? Buffer.from(descriptor.body, 'utf8')
    : Buffer.from(descriptor.body);

let bodyText = (descriptor: WebhookTestRequestDescriptor) =>
  bodyBytes(descriptor).toString('utf8');

let headerValues = (descriptor: WebhookTestRequestDescriptor, name: string) =>
  descriptor.headers
    .filter(([candidate]) => candidate.toLowerCase() === name.toLowerCase())
    .map(([, value]) => value);

let exactHeader = (descriptor: WebhookTestRequestDescriptor, name: string) => {
  let values = headerValues(descriptor, name);
  if (values.length !== 1) {
    throw new Error(`Expected exactly one ${name} header, received ${values.length}`);
  }
  return values[0]!;
};

let hmac = (message: string | Uint8Array, encoding: 'hex' | 'base64' | 'base64url' = 'hex') =>
  createHmac('sha256', TEST_HMAC_SECRET).update(message).digest(encoding);

let privateKey = () =>
  createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'),
      Buffer.from(TEST_ED25519_PRIVATE_SEED_HEX, 'hex')
    ]),
    format: 'der',
    type: 'pkcs8'
  });

let ed25519Signature = (timestamp: string, descriptor: WebhookTestRequestDescriptor) =>
  signEd25519(
    null,
    Buffer.concat([Buffer.from(timestamp, 'utf8'), bodyBytes(descriptor)]),
    privateKey()
  ).toString('hex');

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

let parseJwt = (descriptor: WebhookTestRequestDescriptor) => {
  let authorization = exactHeader(descriptor, 'authorization');
  expect(authorization.startsWith('JWT ')).toBe(true);
  let parts = authorization.slice(4).split('.');
  if (parts.length !== 3) throw new Error('Expected a three-part JWT');
  return {
    parts,
    header: JSON.parse(Buffer.from(parts[0]!, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >,
    claims: JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >
  };
};

let graphValues = (descriptor: WebhookTestRequestDescriptor) => {
  let parsed = JSON.parse(bodyText(descriptor)) as { value?: unknown };
  if (!Array.isArray(parsed.value)) throw new Error('Expected a Graph value array');
  return parsed.value as Record<string, unknown>[];
};

let credentialHeaders = new Set([
  'x-test-api-key',
  'x-test-signature',
  'x-test-ed25519-signature',
  'x-slack-signature',
  'stripe-signature',
  'x-zm-signature',
  'x-hubspot-signature-v3',
  'x-gitlab-token',
  'x-zendesk-webhook-signature',
  'typeform-signature',
  'linear-signature',
  'authorization',
  'x-signature-ed25519',
  'x-test-provider-token'
]);

let stripHeaderCredential = (name: string, value: string) => {
  let normalized = name.toLowerCase();
  if (!credentialHeaders.has(normalized)) return value;
  if (normalized === 'stripe-signature') {
    return value
      .split(',')
      .map(part => (part.startsWith('v1=') ? 'v1=<credential>' : part))
      .join(',');
  }
  if (normalized === 'authorization') {
    let [header, payload] = value.slice(4).split('.');
    return `JWT ${header}.${payload}.<credential>`;
  }
  for (let prefix of ['v0=', 'sha256=']) {
    if (value.startsWith(prefix)) return `${prefix}<credential>`;
  }
  return '<credential>';
};

let nonCredentialView = (
  key: WebhookTestTriggerKey,
  descriptor: WebhookTestRequestDescriptor
) => {
  let url = new URL(descriptor.url);
  if (key === 'verify_static_query') url.searchParams.set('api_key', '<credential>');

  let body = bodyText(descriptor);
  if (key === 'verify_static_json') {
    let parsed = JSON.parse(body) as Record<string, unknown>;
    parsed.api_key = '<credential>';
    body = JSON.stringify(parsed);
  }
  if (key === 'verify_preset_graph_change_notification_v1') {
    let parsed = JSON.parse(body) as { value: Record<string, unknown>[] };
    parsed.value = parsed.value.map(item => ({ ...item, clientState: '<credential>' }));
    body = JSON.stringify(parsed);
  }

  return {
    method: descriptor.method,
    url: url.toString(),
    headers: descriptor.headers.map(
      ([name, value]) => [name, stripHeaderCredential(name, value)] as [string, string]
    ),
    body,
    eventId: descriptor.eventId
  };
};

let credentialView = (
  key: WebhookTestTriggerKey,
  descriptor: WebhookTestRequestDescriptor
) => {
  if (key === 'verify_static_query') {
    return new URL(descriptor.url).searchParams.get('api_key');
  }
  if (key === 'verify_static_json') {
    return (JSON.parse(bodyText(descriptor)) as Record<string, unknown>).api_key;
  }
  if (key === 'verify_preset_graph_change_notification_v1') {
    return graphValues(descriptor).map(value => value.clientState);
  }
  return descriptor.headers
    .filter(([name]) => credentialHeaders.has(name.toLowerCase()))
    .map(([, value]) => value);
};

describe('webhook test request trigger-key contract', () => {
  it('exports the exact closed set of 30 current delivery trigger keys', () => {
    expect(WEBHOOK_TEST_TRIGGER_KEYS).toEqual(EXPECTED_TRIGGER_KEYS);
    expect(WEBHOOK_TEST_TRIGGER_KEYS).toHaveLength(30);
    expect(new Set(WEBHOOK_TEST_TRIGGER_KEYS)).toHaveLength(30);
    expect(WEBHOOK_TEST_TRIGGER_KEYS.slice(5, 16)).toEqual(
      slateWebhookPresetIds.map(preset => `verify_preset_${preset.replaceAll('.', '_')}`)
    );
    expect(WEBHOOK_TEST_TRIGGER_KEYS.slice(16, 19)).toEqual([
      'verify_slack_interactivity_v0',
      'verify_slack_slash_command_v0',
      'verify_slack_ssl_check_v0'
    ]);
    expect(WEBHOOK_TEST_TRIGGER_KEYS.slice(19)).toEqual(
      SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS.map(
        verifierId => `verify_provider_${verifierId.replaceAll('.', '_')}`
      )
    );
  });

  it('uses injected clock and event ID values in fetch-compatible descriptors', () => {
    for (let key of WEBHOOK_TEST_TRIGGER_KEYS) {
      let descriptor = build(key);
      expect(descriptor.method, key).toBe('POST');
      expect(descriptor.eventId, key).toBe(EVENT_ID);
      expect(descriptor.expectedOutcome, key).toBe('accepted');
      expect(
        descriptor.headers.every(header => header.every(value => typeof value === 'string'))
      ).toBe(true);
      expect(
        () =>
          new Request(descriptor.url, {
            method: descriptor.method,
            headers: descriptor.headers,
            body: descriptor.body
          })
      ).not.toThrow();
    }
  });

  it('creates fresh timestamps and unique event IDs by default at call time', () => {
    let before = Math.floor(Date.now() / 1000);
    let first = buildWebhookTestRequest('verify_preset_discord_interactions_v1', CALLBACK_URL);
    let second = buildWebhookTestRequest(
      'verify_preset_discord_interactions_v1',
      CALLBACK_URL
    );
    let after = Math.floor(Date.now() / 1000);

    expect(first.eventId).not.toBe(second.eventId);
    for (let descriptor of [first, second]) {
      let timestamp = Number(exactHeader(descriptor, 'x-signature-timestamp'));
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    }
  });

  it('keeps Discord dispatch explicit and canonical preset branching exhaustive', () => {
    let source = readFileSync(new URL('./requests.ts', import.meta.url), 'utf8');
    expect(source).toContain("if (preset === 'discord.interactions.v1')");
    expect(source).toContain('preset satisfies never');
    expect(() =>
      buildWebhookTestRequest(
        'verify_preset_future_registry_addition_v1' as WebhookTestTriggerKey,
        CALLBACK_URL,
        { now: NOW_MS, eventId: EVENT_ID }
      )
    ).toThrow(/unknown webhook test trigger key/i);
  });
});

describe('core verifier request bytes', () => {
  it('places the static token only in the selected header, query, or JSON location', () => {
    let header = build('verify_static_header');
    expect(exactHeader(header, 'x-test-api-key')).toBe(TEST_STATIC_TOKEN);
    expect(new URL(header.url).searchParams.has('api_key')).toBe(false);
    expect(JSON.parse(bodyText(header))).toEqual({ event_id: EVENT_ID });

    let query = buildWebhookTestRequest(
      'verify_static_query',
      `${CALLBACK_URL}&api_key=stale`,
      { now: NOW_MS, eventId: EVENT_ID }
    );
    expect(headerValues(query, 'x-test-api-key')).toEqual([]);
    expect(new URL(query.url).searchParams.getAll('api_key')).toEqual([TEST_STATIC_TOKEN]);
    expect(JSON.parse(bodyText(query))).toEqual({ event_id: EVENT_ID });

    let json = build('verify_static_json');
    expect(headerValues(json, 'x-test-api-key')).toEqual([]);
    expect(new URL(json.url).searchParams.has('api_key')).toBe(false);
    expect(JSON.parse(bodyText(json))).toEqual({
      event_id: EVENT_ID,
      api_key: TEST_STATIC_TOKEN
    });
  });

  it('signs the exact raw body with HMAC SHA-256 hex', () => {
    let descriptor = build('verify_raw_hmac');
    expect(exactHeader(descriptor, 'x-test-signature')).toBe(
      hmac(bodyBytes(descriptor), 'hex')
    );
  });

  it('signs timestamp UTF-8 bytes followed by exact body bytes with Ed25519', () => {
    let descriptor = build('verify_ed25519');
    let timestamp = exactHeader(descriptor, 'x-test-timestamp');
    expect(timestamp).toBe(String(NOW_SECONDS));
    expect(exactHeader(descriptor, 'x-test-ed25519-signature')).toBe(
      ed25519Signature(timestamp, descriptor)
    );
  });
});

describe('Hub preset request bytes', () => {
  it('builds Slack v0 from timestamp and exact body bytes', () => {
    let descriptor = build('verify_preset_slack_v0');
    let timestamp = exactHeader(descriptor, 'x-slack-request-timestamp');
    expect(timestamp).toBe(String(NOW_SECONDS));
    expect(exactHeader(descriptor, 'x-slack-signature')).toBe(
      `v0=${hmac(Buffer.concat([Buffer.from(`v0:${timestamp}:`), bodyBytes(descriptor)]))}`
    );
  });

  it('builds Stripe v1 from timestamp and exact body bytes', () => {
    let descriptor = build('verify_preset_stripe_v1');
    let expected = hmac(
      Buffer.concat([Buffer.from(`${NOW_SECONDS}.`, 'utf8'), bodyBytes(descriptor)])
    );
    expect(bodyText(descriptor)).toBe(JSON.stringify({ id: EVENT_ID }));
    expect(exactHeader(descriptor, 'stripe-signature')).toBe(
      `t=${NOW_SECONDS},v1=${expected}`
    );
  });

  it('builds Zoom v0 delivery with numeric event_ts identity', () => {
    let descriptor = build('verify_preset_zoom_v0');
    let timestamp = exactHeader(descriptor, 'x-zm-request-timestamp');
    expect(JSON.parse(bodyText(descriptor))).toEqual({
      event: 'test.delivery',
      event_ts: Number(EVENT_ID)
    });
    expect(exactHeader(descriptor, 'x-zm-signature')).toBe(
      `v0=${hmac(Buffer.concat([Buffer.from(`v0:${timestamp}:`), bodyBytes(descriptor)]))}`
    );
  });

  it('builds HubSpot v3 with production percent-decoding semantics', () => {
    let descriptor = build('verify_preset_hubspot_v3');
    let timestamp = exactHeader(descriptor, 'x-hubspot-request-timestamp');
    let message = Buffer.concat([
      Buffer.from(descriptor.method, 'utf8'),
      Buffer.from(decodeHubSpotCanonicalUri(descriptor.url), 'utf8'),
      bodyBytes(descriptor),
      Buffer.from(timestamp, 'utf8')
    ]);
    expect(timestamp).toBe(String(NOW_MS));
    expect(exactHeader(descriptor, 'x-hubspot-signature-v3')).toBe(hmac(message, 'base64'));
  });

  it('strips callback fragments before returning and signing HubSpot requests', () => {
    let callback =
      'https://callbacks.example.test/hooks/a%2Fb?existing=preserved#client-fragment';
    let transmittedUrl = new URL(callback);
    transmittedUrl.hash = '';
    let descriptor = buildWebhookTestRequest('verify_preset_hubspot_v3', callback, {
      now: NOW_MS,
      eventId: EVENT_ID
    });
    let timestamp = exactHeader(descriptor, 'x-hubspot-request-timestamp');
    let expectedSignature = hmac(
      Buffer.concat([
        Buffer.from(descriptor.method, 'utf8'),
        Buffer.from(decodeHubSpotCanonicalUri(transmittedUrl.toString()), 'utf8'),
        bodyBytes(descriptor),
        Buffer.from(timestamp, 'utf8')
      ]),
      'base64'
    );

    expect(new URL(descriptor.url).hash).toBe('');
    expect(descriptor.url).toBe(transmittedUrl.toString());
    expect(exactHeader(descriptor, 'x-hubspot-signature-v3')).toBe(expectedSignature);
  });

  it('builds GitLab with the fixed token and event UUID', () => {
    let descriptor = build('verify_preset_gitlab_standard_v1');
    expect(exactHeader(descriptor, 'x-gitlab-token')).toBe(TEST_HMAC_SECRET);
    expect(exactHeader(descriptor, 'x-gitlab-event-uuid')).toBe(EVENT_ID);
  });

  it('builds Zendesk from RFC3339 timestamp followed by exact body bytes', () => {
    let descriptor = build('verify_preset_zendesk_v1');
    let timestamp = exactHeader(descriptor, 'x-zendesk-webhook-signature-timestamp');
    expect(timestamp).toBe(NOW_RFC3339);
    expect(exactHeader(descriptor, 'x-zendesk-webhook-signature')).toBe(
      hmac(Buffer.concat([Buffer.from(timestamp, 'utf8'), bodyBytes(descriptor)]), 'base64')
    );
  });

  it('builds Typeform from exact body bytes with sha256 base64 prefix', () => {
    let descriptor = build('verify_preset_typeform_v1');
    expect(exactHeader(descriptor, 'typeform-signature')).toBe(
      `sha256=${hmac(bodyBytes(descriptor), 'base64')}`
    );
  });

  it('builds Linear with body-bound identity and millisecond timestamp', () => {
    let descriptor = build('verify_preset_linear_v1');
    expect(JSON.parse(bodyText(descriptor))).toEqual({
      webhookId: EVENT_ID,
      webhookTimestamp: NOW_MS
    });
    expect(exactHeader(descriptor, 'linear-signature')).toBe(
      hmac(bodyBytes(descriptor), 'hex')
    );
  });

  it('builds authority-valid multi-item Graph delivery bytes', () => {
    let descriptor = build('verify_preset_graph_change_notification_v1');
    let values = graphValues(descriptor);
    expect(values).toHaveLength(2);
    expect(values).toEqual([
      {
        id: `${EVENT_ID}-1`,
        subscriptionId: getTestGraphSubscriptionId(1),
        clientState: getTestGraphClientState(1),
        resource: TEST_GRAPH_RESOURCE
      },
      {
        id: `${EVENT_ID}-2`,
        subscriptionId: getTestGraphSubscriptionId(1),
        clientState: getTestGraphClientState(1),
        resource: TEST_GRAPH_RESOURCE
      }
    ]);
  });

  it('builds Hub Graph delivery with an injected non-v1 active authority', () => {
    let descriptor = buildWebhookTestRequest(
      'verify_preset_graph_change_notification_v1',
      CALLBACK_URL,
      {
        now: NOW_MS,
        eventId: EVENT_ID,
        graphAuthorityVersion: 7
      }
    );
    expect(graphValues(descriptor)).toEqual([
      {
        id: `${EVENT_ID}-1`,
        subscriptionId: getTestGraphSubscriptionId(7),
        clientState: getTestGraphClientState(7),
        resource: TEST_GRAPH_RESOURCE
      },
      {
        id: `${EVENT_ID}-2`,
        subscriptionId: getTestGraphSubscriptionId(7),
        clientState: getTestGraphClientState(7),
        resource: TEST_GRAPH_RESOURCE
      }
    ]);
  });

  it('builds a valid Jira HS256 JWT and independently canonicalized QSH', () => {
    let descriptor = build('verify_preset_jira_oauth_dynamic_webhook_v1');
    let jwt = parseJwt(descriptor);
    expect(jwt.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(jwt.claims).toEqual({
      iss: 'test-jira-client-key',
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 300,
      qsh: computeJiraQsh(descriptor.method, descriptor.url),
      webhookId: EVENT_ID
    });
    expect(jwt.parts[2]).toBe(
      hmac(Buffer.from(`${jwt.parts[0]}.${jwt.parts[1]}`, 'utf8'), 'base64url')
    );
  });

  it('builds Discord delivery type 2 with timestamp-plus-body Ed25519 bytes', () => {
    let descriptor = build('verify_preset_discord_interactions_v1');
    let timestamp = exactHeader(descriptor, 'x-signature-timestamp');
    expect(JSON.parse(bodyText(descriptor))).toEqual({ type: 2, id: EVENT_ID });
    expect(timestamp).toBe(String(NOW_SECONDS));
    expect(exactHeader(descriptor, 'x-signature-ed25519')).toBe(
      ed25519Signature(timestamp, descriptor)
    );
  });
});

describe('Slack request generator', () => {
  let TEAM_ID = 'T0123456789';
  let APP_ID = 'A0123456789';
  let USER_ID = 'U0123456789';
  let CHANNEL_ID = 'C0123456789';
  let TOKEN = 'slack-deprecated-verification-token-v1';
  let CHALLENGE = 'slack-test-challenge-v1';
  let TRIGGER_ID = '123456789.987654321.slack-test-trigger';
  let RESPONSE_URL = 'https://hooks.slack.test/actions/slack-test-response';
  let BOT_ACCESS_TOKEN = 'xoxb-slack-test-bot-token';
  let INTERACTIVITY_POINTER = 'slack-test-interactivity-pointer';
  let INTERACTIVITY_SECRET = 'slack-test-interactivity-secret';
  let RATE_LIMIT_MINUTE = NOW_SECONDS - (NOW_SECONDS % 60);

  let slackBuild = (
    triggerKey: SlackWebhookTestTriggerKey,
    slackCase?: SlackWebhookTestCase,
    invalid = false
  ) =>
    buildWebhookTestRequest(triggerKey, CALLBACK_URL, {
      invalid,
      now: NOW_MS,
      eventId: EVENT_ID,
      ...(slackCase ? { slackCase } : {})
    });

  let expectedInteraction = (type: SlackWebhookTestCase) => {
    let common = {
      type,
      token: TOKEN,
      team: { id: TEAM_ID },
      user: { id: USER_ID },
      api_app_id: APP_ID,
      trigger_id: TRIGGER_ID,
      response_url: RESPONSE_URL,
      bot_access_token: BOT_ACCESS_TOKEN,
      interactivity_pointer: INTERACTIVITY_POINTER,
      interactivity: { interactor: { secret: INTERACTIVITY_SECRET } }
    };
    if (type === 'block-actions') {
      return {
        ...common,
        type: 'block_actions',
        channel: { id: CHANNEL_ID },
        container: { type: 'message', channel_id: CHANNEL_ID },
        actions: [
          { action_id: 'synthetic_action', block_id: 'synthetic_block', value: 'test' }
        ]
      };
    }
    if (type === 'shortcut') {
      return { ...common, type: 'shortcut', callback_id: 'synthetic_shortcut' };
    }
    if (type === 'message-action') {
      return {
        ...common,
        type: 'message_action',
        callback_id: 'synthetic_message_action',
        channel: { id: CHANNEL_ID },
        message: { type: 'message', text: 'Synthetic Slack message action' }
      };
    }
    if (type === 'view-submission' || type === 'view-closed') {
      return {
        ...common,
        type: type === 'view-submission' ? 'view_submission' : 'view_closed',
        view: { id: 'V0123456789', type: 'modal', callback_id: 'synthetic_view' }
      };
    }
    if (type !== 'block-suggestion') throw new Error(`Unexpected interaction case: ${type}`);
    return {
      ...common,
      type: 'block_suggestion',
      action_id: 'synthetic_suggestion',
      value: 'syn',
      view: { id: 'V0123456789', type: 'modal', callback_id: 'synthetic_view' }
    };
  };

  let expectedFormId = (
    triggerKey: WebhookTestTriggerKey,
    family: 'interactivity' | 'slash_command',
    payloadType: string,
    body: string
  ) =>
    `${triggerKey}:${family}:${payloadType}:${createHash('sha256').update(body).digest('hex')}`;

  it('uses the typed default case for each Slack trigger and rejects mismatches', () => {
    expect(slackBuild('verify_preset_slack_v0').slack?.case).toBe('event-callback');
    expect(slackBuild('verify_slack_interactivity_v0').slack?.case).toBe('block-actions');
    expect(slackBuild('verify_slack_slash_command_v0').slack?.case).toBe('slash-command');
    expect(slackBuild('verify_slack_ssl_check_v0').slack?.case).toBe('ssl-check');

    expect(() => slackBuild('verify_preset_slack_v0', 'block-actions')).toThrow(
      /slack case.*not valid.*trigger/i
    );
    expect(() => slackBuild('verify_slack_interactivity_v0', 'event-callback')).toThrow(
      /slack case.*not valid.*trigger/i
    );
    expect(() =>
      buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, {
        now: NOW_MS,
        eventId: EVENT_ID,
        slackCase: 'slash-command'
      } as never)
    ).toThrow(/slack case.*slack trigger/i);
    expect(() =>
      buildWebhookTestRequest('verify_preset_slack_v0', CALLBACK_URL, {
        now: NOW_MS,
        eventId: EVENT_ID,
        slackCase: 'future-case' as SlackWebhookTestCase
      } as never)
    ).toThrow(/unknown slack case/i);
  });

  it('builds exact URL verification, Events API, retry, and rate-limit JSON bytes', () => {
    let cases = [
      {
        slackCase: 'url-verification',
        body: {
          token: TOKEN,
          challenge: CHALLENGE,
          type: 'url_verification'
        },
        mappedId: null,
        response: {
          kind: 'text',
          status: 200,
          contentType: 'text/plain',
          body: CHALLENGE
        },
        redactions: [TOKEN]
      },
      {
        slackCase: 'event-callback',
        body: {
          token: TOKEN,
          team_id: TEAM_ID,
          api_app_id: APP_ID,
          event: {
            type: 'message',
            user: USER_ID,
            text: 'Synthetic Slack webhook test event',
            ts: `${NOW_SECONDS}.000100`,
            channel: CHANNEL_ID,
            event_ts: `${NOW_SECONDS}.000100`,
            channel_type: 'channel'
          },
          type: 'event_callback',
          event_id: EVENT_ID,
          event_time: NOW_SECONDS,
          trigger_id: TRIGGER_ID,
          response_url: RESPONSE_URL,
          bot_access_token: BOT_ACCESS_TOKEN,
          interactivity_pointer: INTERACTIVITY_POINTER,
          interactivity: { interactor: { secret: INTERACTIVITY_SECRET } }
        },
        mappedId: `verify_preset_slack_v0:events_api:event_callback:${EVENT_ID}`,
        response: { kind: 'accepted' },
        redactions: [
          TOKEN,
          TRIGGER_ID,
          RESPONSE_URL,
          BOT_ACCESS_TOKEN,
          INTERACTIVITY_POINTER,
          INTERACTIVITY_SECRET
        ]
      },
      {
        slackCase: 'event-retry',
        body: {
          token: TOKEN,
          team_id: TEAM_ID,
          api_app_id: APP_ID,
          event: {
            type: 'message',
            user: USER_ID,
            text: 'Synthetic Slack webhook test event',
            ts: `${NOW_SECONDS}.000100`,
            channel: CHANNEL_ID,
            event_ts: `${NOW_SECONDS}.000100`,
            channel_type: 'channel'
          },
          type: 'event_callback',
          event_id: EVENT_ID,
          event_time: NOW_SECONDS,
          trigger_id: TRIGGER_ID,
          response_url: RESPONSE_URL,
          bot_access_token: BOT_ACCESS_TOKEN,
          interactivity_pointer: INTERACTIVITY_POINTER,
          interactivity: { interactor: { secret: INTERACTIVITY_SECRET } }
        },
        mappedId: `verify_preset_slack_v0:events_api:event_callback:${EVENT_ID}`,
        response: { kind: 'accepted' },
        redactions: [
          TOKEN,
          TRIGGER_ID,
          RESPONSE_URL,
          BOT_ACCESS_TOKEN,
          INTERACTIVITY_POINTER,
          INTERACTIVITY_SECRET
        ]
      },
      {
        slackCase: 'app-rate-limited',
        body: {
          token: TOKEN,
          type: 'app_rate_limited',
          team_id: TEAM_ID,
          minute_rate_limited: RATE_LIMIT_MINUTE,
          api_app_id: APP_ID
        },
        mappedId: `verify_preset_slack_v0:events_api:app_rate_limited:${TEAM_ID}:${RATE_LIMIT_MINUTE}`,
        response: { kind: 'accepted' },
        redactions: [TOKEN]
      }
    ] as const;

    for (let testCase of cases) {
      let descriptor = slackBuild('verify_preset_slack_v0', testCase.slackCase);
      expect(bodyText(descriptor), testCase.slackCase).toBe(JSON.stringify(testCase.body));
      expect(exactHeader(descriptor, 'content-type')).toBe('application/json');
      expect(descriptor.slack).toEqual({
        case: testCase.slackCase,
        expectedMappedEventId: testCase.mappedId,
        expectedResponse: testCase.response,
        responseRedactionLiterals: testCase.redactions
      });
      expect(headerValues(descriptor, 'x-slack-retry-num'), testCase.slackCase).toEqual(
        testCase.slackCase === 'event-retry' ? ['1'] : []
      );
      expect(headerValues(descriptor, 'x-slack-retry-reason'), testCase.slackCase).toEqual(
        testCase.slackCase === 'event-retry' ? ['http_timeout'] : []
      );
    }
  });

  it.each([
    ['block-actions', 'block_actions'],
    ['shortcut', 'shortcut'],
    ['message-action', 'message_action'],
    ['view-submission', 'view_submission'],
    ['view-closed', 'view_closed'],
    ['block-suggestion', 'block_suggestion']
  ] as const)('builds exact %s interaction form bytes and metadata', (slackCase, payloadType) => {
    let descriptor = slackBuild('verify_slack_interactivity_v0', slackCase);
    let payload = expectedInteraction(slackCase);
    let expectedBody = new URLSearchParams({ payload: JSON.stringify(payload) }).toString();

    expect(bodyText(descriptor)).toBe(expectedBody);
    expect([...new URLSearchParams(bodyText(descriptor)).entries()]).toEqual([
      ['payload', JSON.stringify(payload)]
    ]);
    expect(exactHeader(descriptor, 'content-type')).toBe('application/x-www-form-urlencoded');
    expect(descriptor.slack).toEqual({
      case: slackCase,
      expectedMappedEventId: expectedFormId(
        'verify_slack_interactivity_v0',
        'interactivity',
        payloadType,
        expectedBody
      ),
      expectedResponse: { kind: 'accepted' },
      responseRedactionLiterals: [
        TOKEN,
        TRIGGER_ID,
        RESPONSE_URL,
        BOT_ACCESS_TOKEN,
        INTERACTIVITY_POINTER,
        INTERACTIVITY_SECRET
      ]
    });
  });

  it('builds exact slash-command and SSL-check form bytes and metadata', () => {
    let slash = slackBuild('verify_slack_slash_command_v0', 'slash-command');
    let expectedSlashBody = new URLSearchParams({
      token: TOKEN,
      team_id: TEAM_ID,
      team_domain: 'synthetic-workspace',
      channel_id: CHANNEL_ID,
      channel_name: 'synthetic-channel',
      user_id: USER_ID,
      user_name: 'synthetic-user',
      command: '/synthetic-test',
      text: 'deterministic payload',
      api_app_id: APP_ID,
      trigger_id: TRIGGER_ID,
      response_url: RESPONSE_URL,
      bot_access_token: BOT_ACCESS_TOKEN,
      interactivity_pointer: INTERACTIVITY_POINTER,
      interactivity_secret: INTERACTIVITY_SECRET
    }).toString();
    expect(bodyText(slash)).toBe(expectedSlashBody);
    expect(exactHeader(slash, 'content-type')).toBe('application/x-www-form-urlencoded');
    expect(slash.slack).toEqual({
      case: 'slash-command',
      expectedMappedEventId: expectedFormId(
        'verify_slack_slash_command_v0',
        'slash_command',
        'slash_command',
        expectedSlashBody
      ),
      expectedResponse: { kind: 'accepted' },
      responseRedactionLiterals: [
        TOKEN,
        TRIGGER_ID,
        RESPONSE_URL,
        BOT_ACCESS_TOKEN,
        INTERACTIVITY_POINTER,
        INTERACTIVITY_SECRET
      ]
    });

    let ssl = slackBuild('verify_slack_ssl_check_v0', 'ssl-check');
    expect(bodyText(ssl)).toBe(
      new URLSearchParams({ ssl_check: '1', token: TOKEN }).toString()
    );
    expect(exactHeader(ssl, 'content-type')).toBe('application/x-www-form-urlencoded');
    expect(ssl.slack).toEqual({
      case: 'ssl-check',
      expectedMappedEventId: null,
      expectedResponse: { kind: 'accepted' },
      responseRedactionLiterals: [TOKEN]
    });
  });

  it('independently signs exact bytes and changes only the signature in invalid mode', () => {
    let interactionCases = new Set<SlackWebhookTestCase>([
      'block-actions',
      'shortcut',
      'message-action',
      'view-submission',
      'view-closed',
      'block-suggestion'
    ]);
    for (let slackCase of [
      'url-verification',
      'event-callback',
      'event-retry',
      'app-rate-limited',
      'block-actions',
      'shortcut',
      'message-action',
      'view-submission',
      'view-closed',
      'block-suggestion',
      'slash-command',
      'ssl-check'
    ] as const) {
      let triggerKey: WebhookTestTriggerKey =
        slackCase === 'slash-command'
          ? 'verify_slack_slash_command_v0'
          : slackCase === 'ssl-check'
            ? 'verify_slack_ssl_check_v0'
            : interactionCases.has(slackCase)
              ? 'verify_slack_interactivity_v0'
              : 'verify_preset_slack_v0';
      let valid = slackBuild(triggerKey, slackCase);
      let invalid = slackBuild(triggerKey, slackCase, true);
      let timestamp = exactHeader(valid, 'x-slack-request-timestamp');
      let signature = hmac(
        Buffer.concat([Buffer.from(`v0:${timestamp}:`, 'utf8'), bodyBytes(valid)])
      );

      expect(exactHeader(valid, 'x-slack-signature'), slackCase).toBe(`v0=${signature}`);
      expect(exactHeader(invalid, 'x-slack-signature'), slackCase).not.toBe(`v0=${signature}`);
      expect(bodyBytes(invalid), slackCase).toEqual(bodyBytes(valid));
      expect(
        invalid.headers.filter(([name]) => name !== 'x-slack-signature'),
        slackCase
      ).toEqual(valid.headers.filter(([name]) => name !== 'x-slack-signature'));
      expect(invalid.slack?.expectedResponse).toEqual({ kind: 'rejected' });

      let mutatedBody = Buffer.concat([bodyBytes(valid), Buffer.from(' ')]);
      expect(
        hmac(Buffer.concat([Buffer.from(`v0:${timestamp}:`, 'utf8'), mutatedBody])),
        slackCase
      ).not.toBe(signature);
    }
  });
});

describe('provider-boundary request shapes', () => {
  it('builds every provider fixture with exactly one token and required fields', () => {
    for (let verifierId of SLATE_WEBHOOK_PROVIDER_VERIFIER_IDS) {
      let key = `verify_provider_${verifierId.replaceAll('.', '_')}` as WebhookTestTriggerKey;
      let descriptor = build(key);
      let body = JSON.parse(bodyText(descriptor)) as Record<string, unknown>;

      expect(headerValues(descriptor, 'x-test-provider-token'), verifierId).toEqual([
        TEST_PROVIDER_TOKEN
      ]);
      if (verifierId === 'braintree.delivery.v1') {
        expect(body).toEqual({ delivery_id: EVENT_ID });
      } else if (verifierId === 'paypal.delivery.v1') {
        expect(body).toEqual({
          event_id: EVENT_ID,
          delivery_id: `${EVENT_ID}-delivery`
        });
      } else if (verifierId === 'zoom.delivery.v1') {
        expect(body).toEqual({
          timestamp: String(NOW_SECONDS),
          event_id: EVENT_ID
        });
      } else if (verifierId === 'graph.change_notification.provider.v1') {
        expect(graphValues(descriptor)).toEqual(
          graphValues(build('verify_preset_graph_change_notification_v1'))
        );
      } else {
        expect(body).toEqual({ event_id: EVENT_ID });
      }
    }
  });

  it('keeps non-v1 Graph authority valid when invalid mode changes only provider token', () => {
    let options = {
      now: NOW_MS,
      eventId: EVENT_ID,
      graphAuthorityVersion: 9
    };
    let valid = buildWebhookTestRequest(
      'verify_provider_graph_change_notification_provider_v1',
      CALLBACK_URL,
      options
    );
    let invalid = buildWebhookTestRequest(
      'verify_provider_graph_change_notification_provider_v1',
      CALLBACK_URL,
      { ...options, invalid: true }
    );

    expect(graphValues(valid)).toEqual([
      {
        id: `${EVENT_ID}-1`,
        subscriptionId: getTestGraphSubscriptionId(9),
        clientState: getTestGraphClientState(9),
        resource: TEST_GRAPH_RESOURCE
      },
      {
        id: `${EVENT_ID}-2`,
        subscriptionId: getTestGraphSubscriptionId(9),
        clientState: getTestGraphClientState(9),
        resource: TEST_GRAPH_RESOURCE
      }
    ]);
    expect(bodyBytes(invalid)).toEqual(bodyBytes(valid));
    expect(
      invalid.headers.map(([name, value]) => [
        name,
        name === 'x-test-provider-token' ? '<credential>' : value
      ])
    ).toEqual(
      valid.headers.map(([name, value]) => [
        name,
        name === 'x-test-provider-token' ? '<credential>' : value
      ])
    );
    expect(exactHeader(invalid, 'x-test-provider-token')).not.toBe(
      exactHeader(valid, 'x-test-provider-token')
    );
  });
});

describe('valid bootstrap descriptors', () => {
  it('builds a signed Zoom endpoint validation request', () => {
    let descriptor = buildZoomWebhookBootstrapRequest(CALLBACK_URL, {
      now: NOW_MS,
      eventId: EVENT_ID
    });
    let timestamp = exactHeader(descriptor, 'x-zm-request-timestamp');
    expect(descriptor.expectedOutcome).toBe('sync_only');
    expect(JSON.parse(bodyText(descriptor))).toEqual({
      event: 'endpoint.url_validation',
      payload: { plainToken: EVENT_ID }
    });
    expect(exactHeader(descriptor, 'x-zm-signature')).toBe(
      `v0=${hmac(Buffer.concat([Buffer.from(`v0:${timestamp}:`), bodyBytes(descriptor)]))}`
    );
  });

  it('builds a signed Discord ping request', () => {
    let descriptor = buildDiscordWebhookBootstrapRequest(CALLBACK_URL, {
      now: NOW_MS,
      eventId: EVENT_ID
    });
    let timestamp = exactHeader(descriptor, 'x-signature-timestamp');
    expect(descriptor.expectedOutcome).toBe('sync_only');
    expect(JSON.parse(bodyText(descriptor))).toEqual({ type: 1, id: EVENT_ID });
    expect(exactHeader(descriptor, 'x-signature-ed25519')).toBe(
      ed25519Signature(timestamp, descriptor)
    );
  });

  it('preserves the Graph callback path and adds exactly one validationToken', () => {
    let callback =
      'https://callbacks.example.test/receiver/path%2Fsecret?existing=preserved&validationToken=stale';
    let descriptor = buildGraphWebhookBootstrapRequest(callback, {
      now: NOW_MS,
      eventId: EVENT_ID
    });
    let url = new URL(descriptor.url);
    expect(descriptor.expectedOutcome).toBe('sync_only');
    expect(url.pathname).toBe('/receiver/path%2Fsecret');
    expect(url.searchParams.get('existing')).toBe('preserved');
    expect(url.searchParams.getAll('validationToken')).toEqual([EVENT_ID]);
    expect(bodyText(descriptor)).toBe('');
  });
});

describe('invalid request mode', () => {
  it('changes only credential material and predicts rejection for all 30 deliveries', () => {
    for (let key of WEBHOOK_TEST_TRIGGER_KEYS) {
      let valid = build(key);
      let invalid = build(key, true);

      expect(valid.expectedOutcome, key).toBe('accepted');
      expect(invalid.expectedOutcome, key).toBe('rejected');
      expect(credentialView(key, valid), key).not.toEqual(credentialView(key, invalid));
      expect(nonCredentialView(key, invalid), key).toEqual(nonCredentialView(key, valid));
    }
  });

  it('changes decoded invalid signature bytes when a valid hex signature starts with a', () => {
    let matchingEventId: string | undefined;
    for (let index = 0; index < 256; index += 1) {
      let candidate = buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, {
        now: NOW_MS,
        eventId: String(index)
      });
      if (exactHeader(candidate, 'x-test-signature').startsWith('a')) {
        matchingEventId = String(index);
        break;
      }
    }
    if (!matchingEventId) throw new Error('Expected a bounded lowercase-a HMAC fixture');

    let valid = buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, {
      now: NOW_MS,
      eventId: matchingEventId
    });
    let invalid = buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, {
      invalid: true,
      now: NOW_MS,
      eventId: matchingEventId
    });
    expect(Buffer.from(exactHeader(invalid, 'x-test-signature'), 'hex')).not.toEqual(
      Buffer.from(exactHeader(valid, 'x-test-signature'), 'hex')
    );
  });

  it('changes only the Jira JWT signature segment, not its authenticated claims', () => {
    let valid = parseJwt(build('verify_preset_jira_oauth_dynamic_webhook_v1'));
    let invalid = parseJwt(build('verify_preset_jira_oauth_dynamic_webhook_v1', true));
    expect(invalid.header).toEqual(valid.header);
    expect(invalid.claims).toEqual(valid.claims);
    expect(invalid.parts.slice(0, 2)).toEqual(valid.parts.slice(0, 2));
    expect(invalid.parts[2]).not.toBe(valid.parts[2]);
  });

  it('changes only api_key for the static-query invalid fixture', () => {
    let valid = build('verify_static_query');
    let invalid = build('verify_static_query', true);
    let validUrl = new URL(valid.url);
    let invalidUrl = new URL(invalid.url);
    expect(invalidUrl.searchParams.get('api_key')).not.toBe(
      validUrl.searchParams.get('api_key')
    );
    invalidUrl.searchParams.set('api_key', validUrl.searchParams.get('api_key')!);
    expect(invalidUrl.toString()).toBe(validUrl.toString());
  });
});
