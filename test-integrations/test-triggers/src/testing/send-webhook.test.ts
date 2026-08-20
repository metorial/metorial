import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  getTestGraphSubscriptionId,
  TEST_GRAPH_RESOURCE
} from '../triggers/webhook-verification/graph';
import {
  TEST_ED25519_PRIVATE_SEED_HEX,
  TEST_ED25519_PUBLIC_KEY_HEX,
  TEST_HMAC_SECRET,
  TEST_PROVIDER_TOKEN,
  TEST_STATIC_TOKEN
} from '../triggers/webhook-verification/shared';
import {
  buildDiscordWebhookBootstrapRequest,
  buildGraphWebhookBootstrapRequest,
  buildWebhookTestRequest,
  buildZoomWebhookBootstrapRequest,
  type SlackWebhookTestCase
} from './requests';
import {
  isMainModule,
  parseSendWebhookArguments,
  runSendWebhook,
  SEND_WEBHOOK_USAGE,
  type SendWebhookCliOptions
} from './send-webhook';

let CALLBACK_URL =
  'https://callback-user-sentinel:callback-password-sentinel@callbacks.example.test/callback-prefix-sentinel/callback-path-sentinel?token=callback-query-sentinel#callback-fragment-sentinel';
let NOW_MS = Date.parse('2026-08-18T18:00:00.000Z');
let EVENT_ID = '170000000012345';

let validOptions = (
  overrides: Partial<SendWebhookCliOptions> = {}
): SendWebhookCliOptions => ({
  triggerKey: 'verify_raw_hmac',
  callbackUrl: CALLBACK_URL,
  invalid: false,
  dryRun: false,
  bootstrap: false,
  ...overrides
});

let outputCollector = () => {
  let stdout: string[] = [];
  let stderr: string[] = [];
  return {
    stdout,
    stderr,
    writeOut: (value: string) => stdout.push(value),
    writeErr: (value: string) => stderr.push(value)
  };
};

describe('isMainModule', () => {
  it('matches an entry path reached through a symlinked parent', () => {
    let tempDirectory = mkdtempSync(join(tmpdir(), 'send-webhook-main-'));
    chmodSync(tempDirectory, 0o700);

    try {
      let canonicalTempDirectory = realpathSync(tempDirectory);
      let targetDirectory = join(canonicalTempDirectory, 'target');
      let linkedDirectory = join(tempDirectory, 'linked');
      let targetPath = join(targetDirectory, 'entry.js');
      mkdirSync(targetDirectory, { mode: 0o700 });
      writeFileSync(targetPath, '', { mode: 0o600 });
      symlinkSync(
        targetDirectory,
        linkedDirectory,
        process.platform === 'win32' ? 'junction' : 'dir'
      );

      expect(
        isMainModule(
          pathToFileURL(realpathSync(targetPath)).href,
          join(linkedDirectory, 'entry.js')
        )
      ).toBe(true);
      for (let entryPath of [
        undefined,
        join(tempDirectory, 'missing.js'),
        `${tempDirectory}\0invalid.js`
      ]) {
        expect(isMainModule(import.meta.url, entryPath)).toBe(false);
      }
    } finally {
      rmSync(tempDirectory, { force: true, recursive: true });
    }
  });
});

describe('parseSendWebhookArguments', () => {
  it.each([
    { argv: [], message: /trigger key/i },
    { argv: ['verify_raw_hmac'], message: /callback url/i }
  ])('rejects missing required positional arguments: $argv', ({ argv, message }) => {
    expect(() => parseSendWebhookArguments(argv)).toThrow(message);
  });

  it('rejects an unknown trigger key', () => {
    expect(() =>
      parseSendWebhookArguments([
        'verify_future_webhook',
        'https://callbacks.example.test/hook'
      ])
    ).toThrow(/unknown trigger key/i);
  });

  it.each([
    'not-a-url',
    'ftp://callbacks.example.test/hook',
    'file:///tmp/callback',
    'mailto:test@example.test'
  ])('rejects malformed or non-http(s) callback URL %s', callbackUrl => {
    expect(() => parseSendWebhookArguments(['verify_raw_hmac', callbackUrl])).toThrow(
      /http.*https|callback url/i
    );
  });

  it.each([
    'https://callback-user-sentinel@callbacks.example.test/hook',
    'https://:callback-password-sentinel@callbacks.example.test/hook',
    'https://callback-user-sentinel:callback-password-sentinel@callbacks.example.test/hook'
  ])('rejects callback URL credentials without echoing them: %s', callbackUrl => {
    let thrown: unknown;
    try {
      parseSendWebhookArguments(['verify_raw_hmac', callbackUrl]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TypeError);
    let message = (thrown as Error).message;
    expect(message).toMatch(/callback url.*username.*password/i);
    expect(message).not.toContain('callback-user-sentinel');
    expect(message).not.toContain('callback-password-sentinel');
  });

  it('returns exact typed defaults for required arguments', () => {
    expect(
      parseSendWebhookArguments([
        'verify_raw_hmac',
        'https://callbacks.example.test/hooks/receiver-secret'
      ])
    ).toEqual({
      triggerKey: 'verify_raw_hmac',
      callbackUrl: 'https://callbacks.example.test/hooks/receiver-secret',
      invalid: false,
      dryRun: false,
      bootstrap: false
    } satisfies SendWebhookCliOptions);
  });

  it.each([
    ['verify_preset_slack_v0', 'event-callback'],
    ['verify_slack_interactivity_v0', 'block-actions'],
    ['verify_slack_slash_command_v0', 'slash-command'],
    ['verify_slack_ssl_check_v0', 'ssl-check']
  ] as const)('applies the default Slack case for %s', (triggerKey, slackCase) => {
    expect(
      parseSendWebhookArguments([triggerKey, 'https://callbacks.example.test/hook'])
    ).toEqual({
      triggerKey,
      callbackUrl: 'https://callbacks.example.test/hook',
      invalid: false,
      dryRun: false,
      bootstrap: false,
      slackCase
    });
  });

  it.each([
    ['verify_preset_slack_v0', 'url-verification'],
    ['verify_preset_slack_v0', 'event-retry'],
    ['verify_slack_interactivity_v0', 'view-submission'],
    ['verify_slack_slash_command_v0', 'slash-command'],
    ['verify_slack_ssl_check_v0', 'ssl-check']
  ] as const)('parses --slack-case %s for %s', (triggerKey, slackCase) => {
    expect(
      parseSendWebhookArguments([
        triggerKey,
        'https://callbacks.example.test/hook',
        '--slack-case',
        slackCase
      ])
    ).toMatchObject({ triggerKey, slackCase });
  });

  it.each([
    {
      triggerKey: 'verify_preset_slack_v0',
      flags: ['--slack-case'],
      message: /slack case.*required/i
    },
    {
      triggerKey: 'verify_preset_slack_v0',
      flags: ['--slack-case', '--dry-run'],
      message: /slack case.*required/i
    },
    {
      triggerKey: 'verify_preset_slack_v0',
      flags: ['--slack-case', 'future-case'],
      message: /unknown slack case/i
    },
    {
      triggerKey: 'verify_preset_slack_v0',
      flags: ['--slack-case', 'block-actions'],
      message: /slack case.*not valid.*trigger/i
    },
    {
      triggerKey: 'verify_slack_interactivity_v0',
      flags: ['--slack-case', 'event-callback'],
      message: /slack case.*not valid.*trigger/i
    },
    {
      triggerKey: 'verify_slack_slash_command_v0',
      flags: ['--slack-case', 'ssl-check'],
      message: /slack case.*not valid.*trigger/i
    },
    {
      triggerKey: 'verify_slack_ssl_check_v0',
      flags: ['--slack-case', 'slash-command'],
      message: /slack case.*not valid.*trigger/i
    },
    {
      triggerKey: 'verify_raw_hmac',
      flags: ['--slack-case', 'event-callback'],
      message: /slack case.*slack trigger/i
    },
    {
      triggerKey: 'verify_preset_slack_v0',
      flags: ['--slack-case', 'event-callback', '--slack-case', 'event-retry'],
      message: /duplicate/i
    }
  ])('rejects invalid Slack case arguments: $flags', ({ triggerKey, flags, message }) => {
    expect(() =>
      parseSendWebhookArguments([triggerKey, 'https://callbacks.example.test/hook', ...flags])
    ).toThrow(message);
  });

  it('documents the Slack case flag in CLI usage', () => {
    expect(SEND_WEBHOOK_USAGE).toContain('[--slack-case <case>]');
  });

  it('parses invalid and dry-run flags in either post-positional order', () => {
    expect(
      parseSendWebhookArguments([
        'verify_static_header',
        'http://localhost:4318/callback',
        '--dry-run',
        '--invalid'
      ])
    ).toEqual({
      triggerKey: 'verify_static_header',
      callbackUrl: 'http://localhost:4318/callback',
      invalid: true,
      dryRun: true,
      bootstrap: false
    } satisfies SendWebhookCliOptions);
  });

  it.each([
    { flags: ['--future'] },
    { flags: ['--invalid', '--invalid'] },
    { flags: ['--dry-run', '--dry-run'] },
    { flags: ['--graph-authority-version', '2', '--graph-authority-version', '3'] }
  ])('rejects unknown or duplicate flags: $flags', ({ flags }) => {
    expect(() =>
      parseSendWebhookArguments([
        'verify_raw_hmac',
        'https://callbacks.example.test/hook',
        ...flags
      ])
    ).toThrow(/unknown|duplicate/i);
  });

  it.each([
    { flags: ['--graph-authority-version'] },
    { flags: ['--graph-authority-version', '--invalid'] }
  ])('rejects a missing Graph authority version: $flags', ({ flags }) => {
    expect(() =>
      parseSendWebhookArguments([
        'verify_preset_graph_change_notification_v1',
        'https://callbacks.example.test/hook',
        ...flags
      ])
    ).toThrow(/graph authority version.*required/i);
  });

  it.each([
    '0',
    '-1',
    '1.5',
    'abc',
    '9007199254740992'
  ])('rejects invalid Graph authority version %s', version => {
    expect(() =>
      parseSendWebhookArguments([
        'verify_preset_graph_change_notification_v1',
        'https://callbacks.example.test/hook',
        '--graph-authority-version',
        version
      ])
    ).toThrow(/positive integer/i);
  });

  it('parses a valid Graph authority version exactly', () => {
    expect(
      parseSendWebhookArguments([
        'verify_provider_graph_change_notification_provider_v1',
        'https://callbacks.example.test/hook',
        '--invalid',
        '--graph-authority-version',
        '7',
        '--dry-run'
      ])
    ).toEqual({
      triggerKey: 'verify_provider_graph_change_notification_provider_v1',
      callbackUrl: 'https://callbacks.example.test/hook',
      invalid: true,
      dryRun: true,
      bootstrap: false,
      graphAuthorityVersion: 7
    } satisfies SendWebhookCliOptions);
  });

  it('accepts a Graph authority version for the Graph Hub preset', () => {
    expect(
      parseSendWebhookArguments([
        'verify_preset_graph_change_notification_v1',
        'https://callbacks.example.test/hook',
        '--graph-authority-version',
        '5'
      ])
    ).toEqual({
      triggerKey: 'verify_preset_graph_change_notification_v1',
      callbackUrl: 'https://callbacks.example.test/hook',
      invalid: false,
      dryRun: false,
      bootstrap: false,
      graphAuthorityVersion: 5
    } satisfies SendWebhookCliOptions);
  });

  it.each([
    'verify_static_header',
    'verify_preset_slack_v0',
    'verify_provider_zoom_delivery_v1'
  ])('rejects Graph authority version for non-Graph trigger %s', triggerKey => {
    expect(() =>
      parseSendWebhookArguments([
        triggerKey,
        'https://callbacks.example.test/hook',
        '--graph-authority-version',
        '2'
      ])
    ).toThrow(/graph authority version.*graph trigger/i);
  });

  it.each([
    'verify_preset_zoom_v0',
    'verify_preset_discord_interactions_v1',
    'verify_preset_graph_change_notification_v1'
  ])('parses bootstrap mode for synchronous preset trigger %s', triggerKey => {
    expect(
      parseSendWebhookArguments([
        triggerKey,
        'https://callbacks.example.test/hook',
        '--bootstrap',
        '--dry-run'
      ])
    ).toEqual({
      triggerKey,
      callbackUrl: 'https://callbacks.example.test/hook',
      invalid: false,
      dryRun: true,
      bootstrap: true
    });
  });

  it.each([
    {
      triggerKey: 'verify_raw_hmac',
      flags: ['--bootstrap'],
      message: /bootstrap.*zoom.*discord.*graph/i
    },
    {
      triggerKey: 'verify_preset_zoom_v0',
      flags: ['--bootstrap', '--invalid'],
      message: /invalid.*bootstrap/i
    },
    {
      triggerKey: 'verify_preset_graph_change_notification_v1',
      flags: ['--bootstrap', '--graph-authority-version', '2'],
      message: /graph authority version.*bootstrap/i
    }
  ])('rejects incompatible bootstrap arguments for $triggerKey: $flags', ({
    triggerKey,
    flags,
    message
  }) => {
    expect(() =>
      parseSendWebhookArguments([triggerKey, 'https://callbacks.example.test/hook', ...flags])
    ).toThrow(message);
  });

  it.each([
    { argv: ['--dry-run', 'verify_raw_hmac', 'https://callbacks.example.test/hook'] },
    { argv: ['verify_raw_hmac', '--dry-run', 'https://callbacks.example.test/hook'] },
    {
      argv: ['verify_raw_hmac', 'https://callbacks.example.test/hook', 'extra-position']
    }
  ])('enforces trigger-key, callback-URL, then flags argument order: $argv', ({ argv }) => {
    expect(() => parseSendWebhookArguments(argv)).toThrow(
      /argument order|unexpected argument/i
    );
  });
});

describe('runSendWebhook', () => {
  it('prints a secret-free dry-run summary without calling fetch', async () => {
    let output = outputCollector();
    let fetch = vi.fn<typeof globalThis.fetch>();
    let result = await runSendWebhook(validOptions({ invalid: true, dryRun: true }), {
      fetch,
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    let printed = [...output.stdout, ...output.stderr].join('\n');
    let descriptor = buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, {
      invalid: true,
      now: NOW_MS,
      eventId: EVENT_ID
    });
    let bodyByteLength = Buffer.byteLength(descriptor.body);
    expect(printed).toContain('Trigger key: verify_raw_hmac');
    expect(printed).toContain(`Event ID: ${EVENT_ID}`);
    expect(printed).toContain('Method: POST');
    expect(printed).toContain('Header names: content-type, x-test-signature');
    expect(printed).toContain(`Body byte length: ${bodyByteLength}`);
    expect(printed).toContain('Expected outcome: rejected');
    expect(printed).toContain('Invalid: true');
    expect(printed).not.toContain('Graph authority version:');
    for (let forbidden of [
      CALLBACK_URL,
      'callbacks.example.test',
      'callback-user-sentinel',
      'callback-password-sentinel',
      'callback-path-sentinel',
      'callback-query-sentinel',
      descriptor.body.toString(),
      ...descriptor.headers.map(([, value]) => value),
      TEST_STATIC_TOKEN,
      TEST_HMAC_SECRET,
      TEST_PROVIDER_TOKEN,
      TEST_ED25519_PUBLIC_KEY_HEX,
      TEST_ED25519_PRIVATE_SEED_HEX
    ]) {
      expect(printed).not.toContain(forbidden);
    }
  });

  it('includes the Graph authority version only for Graph dry runs', async () => {
    let output = outputCollector();
    let result = await runSendWebhook(
      validOptions({
        triggerKey: 'verify_preset_graph_change_notification_v1',
        graphAuthorityVersion: 9,
        dryRun: true
      }),
      {
        fetch: vi.fn<typeof globalThis.fetch>(),
        ...output,
        now: () => NOW_MS,
        eventId: () => EVENT_ID
      }
    );

    expect(result).toBe(0);
    expect(output.stdout.join('\n')).toContain('Graph authority version: 9');
    expect(output.stdout.join('\n')).not.toContain('test-graph-client-state-v9');
  });

  it.each([
    { slackCase: 'url-verification', emitsEvent: false, mapped: null },
    { slackCase: 'event-callback', emitsEvent: true, mapped: true },
    { slackCase: 'ssl-check', emitsEvent: false, mapped: null }
  ] as const)('prints secret-free Slack $slackCase dry-run evidence', async ({
    slackCase,
    emitsEvent,
    mapped
  }) => {
    let triggerKey: SendWebhookCliOptions['triggerKey'] =
      slackCase === 'ssl-check' ? 'verify_slack_ssl_check_v0' : 'verify_preset_slack_v0';
    let output = outputCollector();
    let options = validOptions({
      triggerKey,
      slackCase,
      dryRun: true
    });
    let descriptor = buildWebhookTestRequest(triggerKey, CALLBACK_URL, {
      now: NOW_MS,
      eventId: EVENT_ID,
      slackCase
    });

    let result = await runSendWebhook(options, {
      fetch: vi.fn<typeof globalThis.fetch>(),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    let printed = output.stdout.join('\n');
    expect(printed).toContain(`Slack case: ${slackCase}`);
    expect(printed).toContain(`Request seed: ${EVENT_ID}`);
    expect(printed).toContain(`Emits event: ${emitsEvent ? 'yes' : 'no'}`);
    if (mapped) {
      expect(printed).toContain(
        `Expected mapped event ID: ${descriptor.slack?.expectedMappedEventId}`
      );
    } else {
      expect(printed).not.toContain('Expected mapped event ID:');
    }
    for (let forbidden of [
      CALLBACK_URL,
      descriptor.body.toString(),
      ...descriptor.headers.map(([, value]) => value),
      ...(descriptor.slack?.responseRedactionLiterals ?? [])
    ]) {
      expect(printed).not.toContain(forbidden);
    }
  });

  it('sends the exact descriptor method, ordered headers, and body bytes', async () => {
    let output = outputCollector();
    let requestInput: string | URL | Request | undefined;
    let requestInit: RequestInit | undefined;
    let fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      requestInput = input;
      requestInit = init;
      return new Response('accepted', {
        status: 202,
        headers: [['x-observation', 'safe response']]
      });
    });
    let options = validOptions();
    let expected = buildWebhookTestRequest(options.triggerKey, options.callbackUrl, {
      invalid: false,
      now: NOW_MS,
      eventId: EVENT_ID
    });

    let result = await runSendWebhook(options, {
      fetch,
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(requestInput).toBe(expected.url);
    expect(requestInit?.method).toBe(expected.method);
    expect(requestInit?.redirect).toBe('manual');
    expect(requestInit?.headers).toEqual(expected.headers);
    expect(Buffer.from(requestInit?.body as string | Uint8Array)).toEqual(
      Buffer.from(expected.body)
    );
  });

  it.each([
    {
      triggerKey: 'verify_preset_zoom_v0',
      build: buildZoomWebhookBootstrapRequest
    },
    {
      triggerKey: 'verify_preset_discord_interactions_v1',
      build: buildDiscordWebhookBootstrapRequest
    },
    {
      triggerKey: 'verify_preset_graph_change_notification_v1',
      build: buildGraphWebhookBootstrapRequest
    }
  ] as const)('sends the exact synchronous bootstrap descriptor for $triggerKey', async ({
    triggerKey,
    build
  }) => {
    let output = outputCollector();
    let requestInput: string | URL | Request | undefined;
    let requestInit: RequestInit | undefined;
    let fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
      requestInput = input;
      requestInit = init;
      return new Response('bootstrap accepted', { status: 200 });
    });
    let options = validOptions({ triggerKey, bootstrap: true });
    let expected = build(CALLBACK_URL, { now: NOW_MS, eventId: EVENT_ID });

    let result = await runSendWebhook(options, {
      fetch,
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    expect(requestInput).toBe(expected.url);
    expect(requestInit?.method).toBe(expected.method);
    expect(requestInit?.headers).toEqual(expected.headers);
    expect(Buffer.from(requestInit?.body as string | Uint8Array)).toEqual(
      Buffer.from(expected.body)
    );
    expect(output.stdout.join('\n')).toContain(`Event ID: ${EVENT_ID}`);
  });

  it('does not follow a redirect or forward callback credentials', async () => {
    let output = outputCollector();
    let fetch = vi.fn<typeof globalThis.fetch>(async () => {
      return new Response(null, {
        status: 302,
        headers: [['location', 'https://redirect-target.example.test/credential-sink']]
      });
    });

    let result = await runSendWebhook(validOptions(), {
      fetch,
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(
      buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, {
        now: NOW_MS,
        eventId: EVENT_ID
      }).url
    );
    expect(fetch.mock.calls[0]?.[1]?.redirect).toBe('manual');
    expect(output.stderr.join('\n')).toMatch(/expected.*received status 302/i);
    expect([...output.stdout, ...output.stderr].join('\n')).not.toContain(
      'redirect-target.example.test'
    );
  });

  it('prints response evidence while redacting response values and request-derived secrets', async () => {
    let output = outputCollector();
    let responseSentinel = 'response-header-secret-sentinel';
    let callback = new URL(CALLBACK_URL);
    let callbackWithoutCredentials = new URL(CALLBACK_URL);
    callbackWithoutCredentials.username = '';
    callbackWithoutCredentials.password = '';
    let callbackWithoutCredentialsOrQuery = new URL(callbackWithoutCredentials);
    callbackWithoutCredentialsOrQuery.search = '';
    callbackWithoutCredentialsOrQuery.hash = '';
    let graphSubscription = getTestGraphSubscriptionId(17);
    let graphClientState = 'test-graph-client-state-v17';
    let graphValidation = 'test-graph-validation-v17-v16-123e4567-e89b-12d3-a456-426614174000';
    let requestSignature = buildWebhookTestRequest('verify_raw_hmac', CALLBACK_URL, {
      now: NOW_MS,
      eventId: EVENT_ID
    }).headers.find(([name]) => name === 'x-test-signature')![1];
    let responseBody = [
      'ordinary evidence',
      responseSentinel,
      TEST_STATIC_TOKEN,
      TEST_HMAC_SECRET,
      TEST_PROVIDER_TOKEN,
      TEST_ED25519_PUBLIC_KEY_HEX,
      TEST_ED25519_PUBLIC_KEY_HEX.toUpperCase(),
      TEST_ED25519_PRIVATE_SEED_HEX,
      'test-jira-client-key',
      TEST_GRAPH_RESOURCE,
      graphSubscription,
      graphClientState,
      graphValidation,
      CALLBACK_URL,
      callback.toString(),
      callbackWithoutCredentials.toString(),
      callbackWithoutCredentialsOrQuery.toString(),
      callback.origin,
      callback.host,
      callback.hostname,
      callback.pathname,
      `${callback.origin}/callback-prefix-sentinel`,
      'callback-user-sentinel',
      'callback-password-sentinel',
      'callback-query-sentinel',
      'callback-fragment-sentinel',
      'callback-prefix-sentinel',
      'callback-path-sentinel',
      requestSignature
    ].join('|');
    let fetch = vi.fn<typeof globalThis.fetch>(async () => {
      return new Response(responseBody, {
        status: 200,
        headers: [
          [TEST_STATIC_TOKEN, 'credential-shaped header name'],
          ['x-callback-echo', callback.toString()],
          [
            'x-graph-echo',
            `${TEST_GRAPH_RESOURCE}|${graphSubscription}|${graphClientState}|${graphValidation}`
          ],
          ['x-secret-bearing-response', responseSentinel],
          ['x-safe-response', 'visible only as redacted']
        ]
      });
    });

    let result = await runSendWebhook(validOptions(), {
      fetch,
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    let printed = [...output.stdout, ...output.stderr].join('\n');
    expect(printed).toContain('Trigger key: verify_raw_hmac');
    expect(printed).toContain(`Event ID: ${EVENT_ID}`);
    expect(printed).toContain('Response status: 200');
    expect(printed).toContain('x-secret-bearing-response: [redacted]');
    expect(printed).toContain('x-safe-response: [redacted]');
    expect(printed).toContain('Response body (redacted');
    expect(printed).toContain('ordinary evidence');
    for (let forbidden of [
      CALLBACK_URL,
      'callbacks.example.test',
      responseSentinel,
      'visible only as redacted',
      TEST_STATIC_TOKEN,
      TEST_HMAC_SECRET,
      TEST_PROVIDER_TOKEN,
      TEST_ED25519_PUBLIC_KEY_HEX,
      TEST_ED25519_PUBLIC_KEY_HEX.toUpperCase(),
      TEST_ED25519_PRIVATE_SEED_HEX,
      'test-jira-client-key',
      TEST_GRAPH_RESOURCE,
      graphSubscription,
      graphClientState,
      graphValidation,
      CALLBACK_URL,
      callback.toString(),
      callbackWithoutCredentials.toString(),
      callbackWithoutCredentialsOrQuery.toString(),
      callback.origin,
      callback.host,
      callback.hostname,
      callback.pathname,
      `${callback.origin}/callback-prefix-sentinel`,
      'callback-user-sentinel',
      'callback-password-sentinel',
      'callback-query-sentinel',
      'callback-fragment-sentinel',
      'callback-prefix-sentinel',
      'callback-path-sentinel',
      requestSignature
    ]) {
      expect(printed).not.toContain(forbidden);
    }
  });

  it('redacts raw and form-urlencoded variants of callback query secrets', async () => {
    let querySecret = 'callback query secret+value/=?&';
    let callbackUrl = `https://callbacks.example.test/hook?public=benign&secret=${encodeURIComponent(querySecret)}`;
    let formEncodedSecret = new URLSearchParams({ secret: querySecret }).toString();
    let output = outputCollector();

    let result = await runSendWebhook(validOptions({ callbackUrl }), {
      fetch: async () =>
        new Response(`safe evidence|${querySecret}|${formEncodedSecret}`, { status: 200 }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    let printed = [...output.stdout, ...output.stderr].join('\n');
    expect(printed).toContain('safe evidence');
    expect(printed).not.toContain(querySecret);
    expect(printed).not.toContain(formEncodedSecret);
    expect(printed).not.toContain(formEncodedSecret.slice('secret='.length));
  });

  it('redacts every Slack capability literal echoed by the callback', async () => {
    let options = validOptions({
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'event-callback'
    });
    let descriptor = buildWebhookTestRequest(options.triggerKey, options.callbackUrl, {
      now: NOW_MS,
      eventId: EVENT_ID,
      slackCase: options.slackCase
    });
    let literals = descriptor.slack?.responseRedactionLiterals ?? [];
    expect(literals.length).toBeGreaterThan(1);
    let output = outputCollector();

    let result = await runSendWebhook(options, {
      fetch: async () => new Response(`safe-evidence|${literals.join('|')}`, { status: 202 }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    let printed = [...output.stdout, ...output.stderr].join('\n');
    expect(printed).toContain('safe-evidence');
    expect(printed).toContain('Slack case: event-callback');
    expect(printed).toContain(`Request seed: ${EVENT_ID}`);
    expect(printed).toContain(
      `Expected mapped event ID: ${descriptor.slack?.expectedMappedEventId}`
    );
    for (let literal of literals) expect(printed).not.toContain(literal);
  });

  it.each([
    'block-actions',
    'shortcut',
    'message-action',
    'view-submission',
    'view-closed',
    'block-suggestion'
  ] as const)('redacts the deprecated token echoed for %s', async slackCase => {
    let options = validOptions({
      triggerKey: 'verify_slack_interactivity_v0',
      slackCase
    });
    let descriptor = buildWebhookTestRequest(options.triggerKey, options.callbackUrl, {
      now: NOW_MS,
      eventId: EVENT_ID,
      slackCase
    });
    let payloadText = new URLSearchParams(descriptor.body.toString()).get('payload');
    if (!payloadText) throw new Error('Expected one Slack interaction payload');
    let payload = JSON.parse(payloadText) as Record<string, unknown>;
    let token = payload.token;
    expect(token).toBe('slack-deprecated-verification-token-v1');
    expect(descriptor.slack?.responseRedactionLiterals).toContain(token);
    let output = outputCollector();

    let result = await runSendWebhook(options, {
      fetch: async () =>
        new Response(`echoed deprecated token: ${token}`, {
          status: 200,
          headers: {
            'content-type':
              slackCase === 'block-suggestion' ? 'application/json' : 'text/plain'
          }
        }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    expect([...output.stdout, ...output.stderr].join('\n')).not.toContain(token);
  });

  it('normalizes terminal controls before redaction and emits inert one-line evidence', async () => {
    let output = outputCollector();
    let graphSubscription = getTestGraphSubscriptionId(17);
    let graphClientState = 'test-graph-client-state-v17';
    let graphValidation = 'test-graph-validation-v17-v16-123e4567-e89b-12d3-a456-426614174000';
    let responseBody = [
      'control-safe-evidence',
      'callback-\u001b[31mpath-sentinel\u001b[0m',
      'test-static-\u001b]0;terminal-title-attack\u0007token-v1',
      'test-hmac-\u001b[2Jsecret-v1',
      'test-provider-\ntoken-v1',
      'test-graph-\u0000resource',
      'test-graph-subscription-\u001b[?25lv17',
      'test-graph-client-\tstate-v18',
      'test-graph-client-\u001b]8;;https://attacker.example\u0007state-v17\u001b]8;;\u0007',
      'test-graph-validation-v17-\u0008v16-123e4567-e89b-12d3-a456-426614174000',
      'test-static-\u200btoken-v1',
      'test-hmac-\u200dsecret-v1',
      'test-provider-\u2060token-v1',
      'test-graph-\ufeffresource',
      'safe line\nsafe tab\tvalue'
    ].join('|');

    let result = await runSendWebhook(validOptions(), {
      fetch: async () => new Response(responseBody, { status: 200 }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    let bodyLine = output.stdout.find(line => line.startsWith('Response body'));
    expect(bodyLine).toBeDefined();
    expect(bodyLine).toContain('control-safe-evidence');
    expect(bodyLine).toContain('safe line\\nsafe tab\\tvalue');
    expect(
      Array.from(bodyLine!, character => character.codePointAt(0)!).some(
        codePoint => codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)
      )
    ).toBe(false);
    expect(bodyLine).not.toContain('terminal-title-attack');
    for (let defaultIgnorable of ['\u200b', '\u200d', '\u2060', '\ufeff']) {
      expect(bodyLine).not.toContain(defaultIgnorable);
    }
    for (let forbidden of [
      'callback-path-sentinel',
      TEST_STATIC_TOKEN,
      TEST_HMAC_SECRET,
      TEST_GRAPH_RESOURCE,
      graphSubscription,
      graphClientState,
      graphValidation,
      'callback-',
      'path-sentinel',
      'test-static-',
      'token-v1',
      'test-hmac-',
      'secret-v1',
      'test-provider-',
      'test-graph-'
    ]) {
      expect(bodyLine).not.toContain(forbidden);
    }
  });

  it('redacts a credential crossing the displayed response boundary', async () => {
    let output = outputCollector();
    let visiblePrefix = 'boundary-safe-evidence|';
    let responseBody =
      visiblePrefix +
      'x'.repeat(4_096 - visiblePrefix.length - Math.floor(TEST_STATIC_TOKEN.length / 2)) +
      TEST_STATIC_TOKEN +
      '|unread-tail';

    let result = await runSendWebhook(validOptions(), {
      fetch: async () => new Response(responseBody, { status: 200 }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    let bodyLine = output.stdout.find(line => line.startsWith('Response body'));
    expect(bodyLine).toContain('boundary-safe-evidence');
    expect(bodyLine).toContain('[redacted]');
    expect(bodyLine).not.toContain(TEST_STATIC_TOKEN);
    for (let prefixLength = 8; prefixLength <= TEST_STATIC_TOKEN.length; prefixLength += 1) {
      expect(bodyLine).not.toContain(TEST_STATIC_TOKEN.slice(0, prefixLength));
    }
    expect(bodyLine).not.toContain('unread-tail');
  });

  it('redacts a trailing credential prefix in a finite display-truncated response', async () => {
    let output = outputCollector();
    let marker = 'finite-boundary-evidence|';
    let partialCredential = TEST_STATIC_TOKEN.slice(0, 10);
    let responseBody = marker + 'x'.repeat(4_092 - marker.length) + partialCredential;
    expect(Buffer.byteLength(responseBody)).toBeGreaterThan(4_096);
    expect(Buffer.byteLength(responseBody)).toBeLessThanOrEqual(4_352);

    let result = await runSendWebhook(validOptions(), {
      fetch: async () => new Response(responseBody, { status: 200 }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    let bodyLine = output.stdout.find(line => line.startsWith('Response body'));
    expect(bodyLine).toContain(marker);
    expect(bodyLine).toContain('[red');
    expect(bodyLine).toMatch(/truncated to 4096 displayed bytes/i);
    for (let prefixLength = 4; prefixLength <= partialCredential.length; prefixLength += 1) {
      expect(bodyLine).not.toContain(partialCredential.slice(0, prefixLength));
    }
  });

  it('bounds streamed response evidence and cancels before reading later chunks', async () => {
    let output = outputCollector();
    let encoder = new TextEncoder();
    let chunks = [
      encoder.encode('bounded-safe-evidence|'),
      encoder.encode('x'.repeat(5_000)),
      encoder.encode('|unread-tail-secret')
    ];
    let pulls = 0;
    let cancelled = false;
    let stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          let chunk = chunks[pulls];
          pulls += 1;
          if (chunk) controller.enqueue(chunk);
          else controller.close();
        },
        cancel() {
          cancelled = true;
        }
      },
      { highWaterMark: 0 }
    );

    let result = await runSendWebhook(validOptions(), {
      fetch: async () => new Response(stream, { status: 200 }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    expect(cancelled).toBe(true);
    expect(pulls).toBe(2);
    expect(stream.locked).toBe(false);
    let printed = output.stdout.join('\n');
    expect(printed).toContain('bounded-safe-evidence');
    expect(printed).toMatch(/truncated to 4096 displayed bytes/i);
    expect(printed).not.toContain('unread-tail-secret');
    expect(printed.length).toBeLessThan(5_000);
  });

  it('truncates multibyte response evidence on a UTF-8 code point boundary', async () => {
    let output = outputCollector();
    let responseBody = `safe-multibyte-evidencex|${'é'.repeat(3_000)}`;

    let result = await runSendWebhook(validOptions(), {
      fetch: async () => new Response(responseBody, { status: 200 }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(0);
    let bodyLine = output.stdout.find(line => line.startsWith('Response body'));
    expect(bodyLine).toBeDefined();
    let displayedBody = bodyLine?.match(/\): (.*)$/)?.[1];
    expect(displayedBody).toBeDefined();
    expect(displayedBody).toContain('safe-multibyte-evidencex');
    expect(Buffer.byteLength(displayedBody!, 'utf8')).toBeLessThanOrEqual(4_096);
    expect(displayedBody).not.toContain('\uFFFD');
    expect(displayedBody?.endsWith('é')).toBe(true);
  });

  it('reads the response body exactly once and reuses retained bytes for exact validation', async () => {
    let output = outputCollector();
    let response = new Response('slack-test-challenge-v1', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
    let body = response.body;
    if (!body) throw new Error('Expected response body');
    let getReader = vi.spyOn(body, 'getReader');
    let text = vi.spyOn(response, 'text');
    let json = vi.spyOn(response, 'json');
    let arrayBuffer = vi.spyOn(response, 'arrayBuffer');

    let result = await runSendWebhook(
      validOptions({
        triggerKey: 'verify_preset_slack_v0',
        slackCase: 'url-verification'
      }),
      {
        fetch: async () => response,
        ...output,
        now: () => NOW_MS,
        eventId: () => EVENT_ID
      }
    );

    expect(result).toBe(0);
    expect(getReader).toHaveBeenCalledTimes(1);
    expect(text).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(body.locked).toBe(false);
  });

  it.each([
    {
      name: 'URL verification exact challenge',
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'url-verification',
      response: () =>
        new Response('slack-test-challenge-v1', {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        }),
      expected: 0
    },
    {
      name: 'URL verification normalized text media type',
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'url-verification',
      response: () =>
        new Response('slack-test-challenge-v1', {
          status: 200,
          headers: { 'content-type': 'Text/Plain; Charset=UTF-8' }
        }),
      expected: 0
    },
    {
      name: 'URL verification text prefix lookalike',
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'url-verification',
      response: () =>
        new Response('slack-test-challenge-v1', {
          status: 200,
          headers: { 'content-type': 'text/plainx' }
        }),
      expected: 1
    },
    {
      name: 'URL verification wrong body',
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'url-verification',
      response: () =>
        new Response('wrong challenge', {
          status: 200,
          headers: { 'content-type': 'text/plain' }
        }),
      expected: 1
    },
    {
      name: 'URL verification wrong content type',
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'url-verification',
      response: () =>
        new Response('slack-test-challenge-v1', {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }),
      expected: 1
    },
    {
      name: 'SSL empty response',
      triggerKey: 'verify_slack_ssl_check_v0',
      slackCase: 'ssl-check',
      response: () => new Response(null, { status: 200 }),
      expected: 0
    },
    {
      name: 'SSL asynchronous acceptance body',
      triggerKey: 'verify_slack_ssl_check_v0',
      slackCase: 'ssl-check',
      response: () => new Response('not empty', { status: 200 }),
      expected: 0
    },
    {
      name: 'block suggestion exact JSON',
      triggerKey: 'verify_slack_interactivity_v0',
      slackCase: 'block-suggestion',
      response: () =>
        new Response(JSON.stringify({ options: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json; charset=utf-8' }
        }),
      expected: 0
    },
    {
      name: 'block suggestion case-insensitive JSON media type',
      triggerKey: 'verify_slack_interactivity_v0',
      slackCase: 'block-suggestion',
      response: () =>
        new Response(JSON.stringify({ options: [] }), {
          status: 200,
          headers: { 'content-type': 'Application/JSON; Charset=UTF-8' }
        }),
      expected: 0
    },
    {
      name: 'block suggestion asynchronous JSONP acceptance',
      triggerKey: 'verify_slack_interactivity_v0',
      slackCase: 'block-suggestion',
      response: () =>
        new Response(JSON.stringify({ options: [] }), {
          status: 200,
          headers: { 'content-type': 'application/jsonp' }
        }),
      expected: 0
    },
    {
      name: 'block suggestion asynchronous JSON-sequence acceptance',
      triggerKey: 'verify_slack_interactivity_v0',
      slackCase: 'block-suggestion',
      response: () =>
        new Response(JSON.stringify({ options: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json-seq' }
        }),
      expected: 0
    },
    {
      name: 'block suggestion asynchronous structured acceptance',
      triggerKey: 'verify_slack_interactivity_v0',
      slackCase: 'block-suggestion',
      response: () =>
        new Response(JSON.stringify({ options: [], extra: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }),
      expected: 0
    },
    {
      name: 'ordinary Slack acceptance',
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'event-callback',
      response: () => new Response(null, { status: 204 }),
      expected: 0
    },
    {
      name: 'invalid Slack rejection',
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'event-callback',
      invalid: true,
      response: () => new Response(null, { status: 401 }),
      expected: 0
    },
    {
      name: 'invalid Slack acceptance mismatch',
      triggerKey: 'verify_preset_slack_v0',
      slackCase: 'event-callback',
      invalid: true,
      response: () => new Response(null, { status: 200 }),
      expected: 1
    }
  ] as {
    name: string;
    triggerKey: SendWebhookCliOptions['triggerKey'];
    slackCase: SlackWebhookTestCase;
    invalid?: boolean;
    response: () => Response;
    expected: number;
  }[])('validates $name exactly', async testCase => {
    let output = outputCollector();
    let result = await runSendWebhook(
      validOptions({
        triggerKey: testCase.triggerKey,
        slackCase: testCase.slackCase,
        invalid: testCase.invalid ?? false
      }),
      {
        fetch: async () => testCase.response(),
        ...output,
        now: () => NOW_MS,
        eventId: () => EVENT_ID
      }
    );

    expect(result).toBe(testCase.expected);
    if (testCase.expected === 1) {
      expect(output.stderr.join('\n')).toMatch(/expected.*response|did not match/i);
    }
  });

  it('rejects truncated exact Slack responses before parsing retained bytes', async () => {
    let output = outputCollector();
    let result = await runSendWebhook(
      validOptions({
        triggerKey: 'verify_preset_slack_v0',
        slackCase: 'url-verification'
      }),
      {
        fetch: async () =>
          new Response(`slack-test-challenge-v1${' '.repeat(5_000)}`, {
            status: 200,
            headers: { 'content-type': 'text/plain' }
          }),
        ...output,
        now: () => NOW_MS,
        eventId: () => EVENT_ID
      }
    );

    expect(result).toBe(1);
    expect(output.stderr.join('\n')).toMatch(/truncated.*exact.*response/i);
  });

  it('times out a fetch with a generic secret-free error', async () => {
    let output = outputCollector();
    let observedSignal: AbortSignal | undefined;
    let fetch = vi.fn<typeof globalThis.fetch>(
      async (_input, init) =>
        await new Promise<Response>((resolve, reject) => {
          observedSignal = init?.signal ?? undefined;
          let completionTimer = setTimeout(
            () => resolve(new Response('late success', { status: 200 })),
            30
          );
          observedSignal?.addEventListener(
            'abort',
            () => {
              clearTimeout(completionTimer);
              reject(observedSignal?.reason ?? new Error('aborted'));
            },
            { once: true }
          );
        })
    );

    let result = await runSendWebhook(validOptions(), {
      fetch,
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID,
      timeoutMs: 5
    });

    expect(result).toBe(1);
    expect(observedSignal?.aborted).toBe(true);
    expect(output.stderr.join('\n')).toMatch(/request timed out/i);
    let printed = [...output.stdout, ...output.stderr].join('\n');
    expect(printed).not.toContain(CALLBACK_URL);
    expect(printed).not.toContain('callback-path-sentinel');
    expect(printed).not.toContain(TEST_HMAC_SECRET);
  });

  it('times out body evidence, cancels it, and releases the stream reader', async () => {
    let output = outputCollector();
    let cancelled = false;
    let completionTimer: ReturnType<typeof setTimeout> | undefined;
    let stream = new ReadableStream<Uint8Array>({
      start(controller) {
        completionTimer = setTimeout(() => {
          controller.enqueue(new TextEncoder().encode('late response'));
          controller.close();
        }, 30);
      },
      cancel() {
        cancelled = true;
        if (completionTimer) clearTimeout(completionTimer);
      }
    });

    let result = await runSendWebhook(validOptions(), {
      fetch: async () => new Response(stream, { status: 200 }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID,
      timeoutMs: 5
    });

    expect(result).toBe(1);
    expect(cancelled).toBe(true);
    expect(stream.locked).toBe(false);
    expect(output.stderr.join('\n')).toMatch(/request timed out/i);
    expect(output.stdout).toEqual([]);
  });

  it('clears the default request deadline after successful evidence', async () => {
    vi.useFakeTimers();
    try {
      let output = outputCollector();
      let observedSignal: AbortSignal | undefined;
      let result = await runSendWebhook(validOptions(), {
        fetch: async (_input, init) => {
          observedSignal = init?.signal ?? undefined;
          return new Response('accepted', { status: 200 });
        },
        ...output,
        now: () => NOW_MS,
        eventId: () => EVENT_ID
      });

      expect(result).toBe(0);
      expect(observedSignal).toBeDefined();
      expect(vi.getTimerCount()).toBe(0);
      expect(observedSignal?.aborted).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    { invalid: false, status: 204, expected: 0 },
    { invalid: false, status: 400, expected: 1 },
    { invalid: true, status: 401, expected: 0 },
    { invalid: true, status: 200, expected: 1 }
  ])('returns $expected for invalid=$invalid observed status $status', async ({
    invalid,
    status,
    expected
  }) => {
    let output = outputCollector();
    let result = await runSendWebhook(validOptions({ invalid }), {
      fetch: async () => new Response(null, { status }),
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(expected);
    if (expected === 1) {
      expect(output.stderr.join('\n')).toMatch(/expected.*received status/i);
    } else {
      expect(output.stderr).toEqual([]);
    }
  });

  it('returns nonzero for network failure without leaking URL or credentials', async () => {
    let output = outputCollector();
    let result = await runSendWebhook(validOptions(), {
      fetch: async () => {
        throw new Error(
          `connect failed for ${CALLBACK_URL} with ${TEST_HMAC_SECRET} and callback-path-sentinel`
        );
      },
      ...output,
      now: () => NOW_MS,
      eventId: () => EVENT_ID
    });

    expect(result).toBe(1);
    let printed = [...output.stdout, ...output.stderr].join('\n');
    expect(printed).toMatch(/network request failed/i);
    expect(printed).not.toContain(CALLBACK_URL);
    expect(printed).not.toContain(TEST_HMAC_SECRET);
    expect(printed).not.toContain('callback-path-sentinel');
  });
});
