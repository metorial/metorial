import { createHash } from 'node:crypto';
import { SlateContext, SlateLogger } from 'slates';
import { describe, expect, it, vi } from 'vitest';
import { provider } from '../../index';
import { spec } from '../../spec';
import * as webhookVerification from './index';

type SlackActionKey =
  | 'verify_preset_slack_v0'
  | 'verify_slack_interactivity_v0'
  | 'verify_slack_slash_command_v0'
  | 'verify_slack_ssl_check_v0';

type SlackInput = {
  receivedAt: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  payload: Record<string, unknown>;
  slack: {
    requestFamily: 'events_api' | 'interactivity' | 'slash_command' | 'ssl_check';
    payloadType: string;
    sourceId: string;
    rawBodySha256: string;
    retry: { number: number; reason?: string } | null;
  };
};

type SlackRequestResult = {
  inputs: SlackInput[];
  response?: Response;
};

let actionKeys: SlackActionKey[] = [
  'verify_preset_slack_v0',
  'verify_slack_interactivity_v0',
  'verify_slack_slash_command_v0',
  'verify_slack_ssl_check_v0'
];

let sha256 = (body: string | Uint8Array) => createHash('sha256').update(body).digest('hex');

let getAction = (key: SlackActionKey) => {
  let action = provider.actions.find(candidate => candidate.key === key);
  if (!action || action.type !== 'trigger' || !action.handleRequest) {
    throw new Error(`Expected Slack webhook action ${key}`);
  }
  return action;
};

let invoke = async (key: SlackActionKey, request: Request) => {
  let action = getAction(key);
  return (await action.handleRequest!(
    new SlateContext(
      {},
      {
        request,
        state: null,
        registrationDetails: null
      },
      {},
      spec,
      new SlateLogger([])
    ) as never
  )) as unknown as SlackRequestResult;
};

let invokeReadingExactlyOnce = async (key: SlackActionKey, request: Request) => {
  let arrayBuffer = vi.spyOn(request, 'arrayBuffer');
  let text = vi.spyOn(request, 'text');
  let json = vi.spyOn(request, 'json');
  let formData = vi.spyOn(request, 'formData');

  let result = await invoke(key, request);

  expect(arrayBuffer).toHaveBeenCalledTimes(1);
  expect(text).not.toHaveBeenCalled();
  expect(json).not.toHaveBeenCalled();
  expect(formData).not.toHaveBeenCalled();
  expect(request.bodyUsed).toBe(true);
  return result;
};

let mapEvent = async (key: SlackActionKey, input: SlackInput) => {
  let action = getAction(key);
  return (await action.handleEvent(
    new SlateContext({}, input, {}, spec, new SlateLogger([])) as never
  )) as unknown as {
    type: string;
    id: string;
    output: SlackInput;
  };
};

let jsonRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) => {
  let raw = JSON.stringify(body);
  return {
    raw,
    request: new Request('https://callbacks.example.test/receiver-secret?unsafe=secret', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers
      },
      body: raw
    })
  };
};

let formRequest = (params: URLSearchParams, headers: Record<string, string> = {}) => {
  let raw = params.toString();
  return rawFormRequest(raw, headers);
};

let rawFormRequest = (raw: string, headers: Record<string, string> = {}) => {
  return {
    raw,
    request: new Request('https://callbacks.example.test/receiver-secret?unsafe=secret', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...headers
      },
      body: raw
    })
  };
};

let expectNoProviderResponse = (response: Response | undefined) => {
  expect(response).toBeUndefined();
};

describe('specialized Slack webhook actions', () => {
  it('exports and registers all four handlers through the webhook verification index', () => {
    expect(Object.keys(webhookVerification)).toEqual(
      expect.arrayContaining([
        'verifyPresetSlackV0',
        'verifySlackInteractivityV0',
        'verifySlackSlashCommandV0',
        'verifySlackSslCheckV0',
        'supplementarySlackVerificationActions'
      ])
    );
    for (let actionKey of actionKeys) expect(getAction(actionKey).key).toBe(actionKey);
  });

  it('leaves the authenticated URL verification response to the Hub', async () => {
    let { request } = jsonRequest({
      type: 'url_verification',
      challenge: 'exact challenge: å/+/=',
      token: 'must-not-be-retained'
    });

    let result = await invokeReadingExactlyOnce('verify_preset_slack_v0', request);

    expect(result.inputs).toEqual([]);
    expectNoProviderResponse(result.response);
  });

  it('maps Events API callbacks with stable identity, retry metadata, and recursive redaction', async () => {
    let { raw, request } = jsonRequest(
      {
        type: 'event_callback',
        event_id: 'Ev-callback-1',
        token: 'top-level-token',
        trigger_id: 'trigger-secret',
        response_url: 'https://response.example.test/secret',
        response_urls: ['https://response.example.test/one'],
        bot_access_token: 'bot-token',
        interactivity_pointer: 'pointer-secret',
        event: {
          type: 'message',
          text: 'safe text',
          nested: {
            token: 'nested-token',
            response_url: 'nested-response-secret'
          }
        },
        interactivity: {
          interactor: {
            secret: 'nested-interactor-secret',
            name: 'safe interactor'
          }
        }
      },
      {
        'x-slack-signature': 'v0=signature-secret',
        'x-slack-request-timestamp': '1700000000',
        'x-slack-retry-num': '2',
        'x-slack-retry-reason': 'http_timeout',
        'x-safe-header': 'safe'
      }
    );

    let result = await invokeReadingExactlyOnce('verify_preset_slack_v0', request);
    expect(result.response).toBeUndefined();
    expect(result.inputs).toHaveLength(1);
    let input = result.inputs[0]!;
    expect(input).toMatchObject({
      receivedAt: expect.any(String),
      method: 'POST',
      url: 'https://callbacks.example.test/:receiver-secret',
      headers: {
        'content-type': 'application/json',
        'x-safe-header': 'safe',
        'x-slack-retry-num': '2',
        'x-slack-retry-reason': 'http_timeout',
        'x-slack-signature': '[redacted]',
        'x-slack-request-timestamp': '[redacted]'
      },
      payload: {
        type: 'event_callback',
        event_id: 'Ev-callback-1',
        token: '[redacted]',
        trigger_id: '[redacted]',
        response_url: '[redacted]',
        response_urls: '[redacted]',
        bot_access_token: '[redacted]',
        interactivity_pointer: '[redacted]',
        event: {
          type: 'message',
          text: 'safe text',
          nested: {
            token: '[redacted]',
            response_url: '[redacted]'
          }
        },
        interactivity: {
          interactor: {
            secret: '[redacted]',
            name: 'safe interactor'
          }
        }
      },
      slack: {
        requestFamily: 'events_api',
        payloadType: 'event_callback',
        sourceId: 'Ev-callback-1',
        rawBodySha256: sha256(raw),
        retry: { number: 2, reason: 'http_timeout' }
      }
    });
    expect(JSON.stringify(input)).not.toContain('signature-secret');
    expect(JSON.stringify(input)).not.toContain('nested-interactor-secret');

    let firstEvent = await mapEvent('verify_preset_slack_v0', input);
    let secondEvent = await mapEvent('verify_preset_slack_v0', {
      ...input,
      receivedAt: '2099-01-01T00:00:00.000Z'
    });
    expect(firstEvent).toEqual({
      type: 'test.webhook.verify_preset_slack_v0',
      id: 'verify_preset_slack_v0:events_api:event_callback:Ev-callback-1',
      output: input
    });
    expect(secondEvent.id).toBe(firstEvent.id);
  });

  it('maps rate-limit callbacks from their team and minute identity without inventing dedupe data', async () => {
    let { raw, request } = jsonRequest({
      type: 'app_rate_limited',
      team_id: 'T-rate-limit',
      minute_rate_limited: 2_817_777
    });

    let result = await invokeReadingExactlyOnce('verify_preset_slack_v0', request);
    expect(result.inputs).toHaveLength(1);
    let input = result.inputs[0]!;
    expect(input.slack).toEqual({
      requestFamily: 'events_api',
      payloadType: 'app_rate_limited',
      sourceId: 'T-rate-limit:2817777',
      rawBodySha256: sha256(raw),
      retry: null
    });
    await expect(mapEvent('verify_preset_slack_v0', input)).resolves.toMatchObject({
      id: 'verify_preset_slack_v0:events_api:app_rate_limited:T-rate-limit:2817777'
    });
  });

  it('emits no Events API input for malformed, unsupported, or identity-free bodies', async () => {
    let cases: (string | Uint8Array)[] = [
      '{"type":',
      JSON.stringify(['event_callback']),
      JSON.stringify({ type: 'unknown' }),
      JSON.stringify({ type: 'event_callback', event_id: '' }),
      JSON.stringify({
        type: 'app_rate_limited',
        team_id: '',
        minute_rate_limited: 10
      }),
      new Uint8Array([0xff, 0xfe, 0xfd])
    ];

    for (let body of cases) {
      let request = new Request('https://callbacks.example.test/receiver-secret', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body
      });
      let result = await invokeReadingExactlyOnce('verify_preset_slack_v0', request);
      expect(result).toEqual({ inputs: [] });
    }
  });

  it.each([
    'block_actions',
    'shortcut',
    'message_action',
    'view_submission',
    'view_closed',
    'block_suggestion'
  ])('maps supported %s interactivity without authoring the Hub response', async type => {
    let interaction = {
      type,
      user: { id: 'U-interactor', token: 'nested-user-token' },
      trigger_id: 'interaction-trigger-secret',
      response_url: 'https://response.example.test/interaction-secret',
      response_urls: ['https://response.example.test/one'],
      bot_access_token: 'bot-access-secret',
      interactivity_pointer: 'interaction-pointer-secret',
      interactivity: {
        interactor: { secret: 'interactor-secret', safe: 'preserved' }
      }
    };
    let params = new URLSearchParams();
    params.set('payload', JSON.stringify(interaction));
    params.set('ignored_form_field', 'safe');
    let { raw, request } = formRequest(params, {
      'x-slack-retry-num': '0',
      'x-slack-retry-reason': 'connection_failed'
    });

    let result = await invokeReadingExactlyOnce('verify_slack_interactivity_v0', request);
    expect(result.inputs).toHaveLength(1);
    let input = result.inputs[0]!;
    expect(input.payload).toEqual({
      ...interaction,
      user: { id: 'U-interactor', token: '[redacted]' },
      trigger_id: '[redacted]',
      response_url: '[redacted]',
      response_urls: '[redacted]',
      bot_access_token: '[redacted]',
      interactivity_pointer: '[redacted]',
      interactivity: {
        interactor: { secret: '[redacted]', safe: 'preserved' }
      }
    });
    expect(input.slack).toEqual({
      requestFamily: 'interactivity',
      payloadType: type,
      sourceId: sha256(raw),
      rawBodySha256: sha256(raw),
      retry: { number: 0, reason: 'connection_failed' }
    });
    await expect(mapEvent('verify_slack_interactivity_v0', input)).resolves.toMatchObject({
      id: `verify_slack_interactivity_v0:interactivity:${type}:${sha256(raw)}`
    });

    expectNoProviderResponse(result.response);
  });

  it('acknowledges malformed, duplicate, non-object, and unsupported matched interactions without input', async () => {
    let malformedCases = [
      ['{'],
      [JSON.stringify([])],
      [JSON.stringify({ type: 'unsupported_interaction' })],
      [JSON.stringify({ type: 'block_actions' }), JSON.stringify({ type: 'shortcut' })]
    ];

    for (let payloads of malformedCases) {
      let params = new URLSearchParams();
      for (let payload of payloads) params.append('payload', payload);
      let { request } = formRequest(params);
      let result = await invokeReadingExactlyOnce('verify_slack_interactivity_v0', request);

      expect(result.inputs).toEqual([]);
      expectNoProviderResponse(result.response);
    }
  });

  it('rejects malformed percent escapes and percent-encoded invalid UTF-8 before mapping forms', async () => {
    let validInteraction = encodeURIComponent(JSON.stringify({ type: 'block_actions' }));
    let cases: { key: SlackActionKey; raw: string }[] = [
      {
        key: 'verify_slack_interactivity_v0',
        raw: `payload=${validInteraction}&extra=%`
      },
      {
        key: 'verify_slack_interactivity_v0',
        raw: `payload=${validInteraction}&extra=%G0`
      },
      {
        key: 'verify_slack_interactivity_v0',
        raw: `payload=${validInteraction}&extra=%FF`
      },
      {
        key: 'verify_slack_interactivity_v0',
        raw: 'payload=%FF'
      },
      {
        key: 'verify_slack_slash_command_v0',
        raw: 'command=%2Fdeploy&text=%FF'
      }
    ];

    for (let testCase of cases) {
      let { request } = rawFormRequest(testCase.raw);
      let result = await invokeReadingExactlyOnce(testCase.key, request);

      expect(result.inputs, testCase.raw).toEqual([]);
      expectNoProviderResponse(result.response);
    }
  });

  it('decodes plus as space and valid percent-encoded UTF-8 without changing raw-byte identity', async () => {
    let raw = 'command=%2Fdeploy&text=hello+world&literal_plus=%2B&utf8=%E2%9C%93';
    let { request } = rawFormRequest(raw);

    let result = await invokeReadingExactlyOnce('verify_slack_slash_command_v0', request);

    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0]).toMatchObject({
      payload: {
        command: '/deploy',
        text: 'hello world',
        literal_plus: '+',
        utf8: '✓'
      },
      slack: {
        sourceId: sha256(raw),
        rawBodySha256: sha256(raw)
      }
    });
    expectNoProviderResponse(result.response);
  });

  it('maps slash commands while leaving acknowledgement rendering to the Hub', async () => {
    let params = new URLSearchParams();
    params.set('command', '/deploy');
    params.set('text', 'production');
    params.set('team_id', 'T-slash');
    params.set('user_id', 'U-slash');
    params.set('token', 'legacy-token-secret');
    params.set('trigger_id', 'slash-trigger-secret');
    params.set('response_url', 'https://response.example.test/slash-secret');
    params.set('response_urls', '["https://response.example.test/slash-secret"]');
    params.set('bot_access_token', 'slash-bot-secret');
    params.set('interactivity_pointer', 'slash-pointer-secret');
    let { raw, request } = formRequest(params, {
      'x-slack-retry-num': '1.5',
      'x-slack-retry-reason': 'ignored_without_valid_number'
    });

    let result = await invokeReadingExactlyOnce('verify_slack_slash_command_v0', request);
    expect(result.inputs).toHaveLength(1);
    let input = result.inputs[0]!;
    expect(input.payload).toEqual({
      command: '/deploy',
      text: 'production',
      team_id: 'T-slash',
      user_id: 'U-slash',
      token: '[redacted]',
      trigger_id: '[redacted]',
      response_url: '[redacted]',
      response_urls: '[redacted]',
      bot_access_token: '[redacted]',
      interactivity_pointer: '[redacted]'
    });
    expect(input.slack).toEqual({
      requestFamily: 'slash_command',
      payloadType: 'slash_command',
      sourceId: sha256(raw),
      rawBodySha256: sha256(raw),
      retry: null
    });
    await expect(mapEvent('verify_slack_slash_command_v0', input)).resolves.toMatchObject({
      id: `verify_slack_slash_command_v0:slash_command:slash_command:${sha256(raw)}`
    });
    expectNoProviderResponse(result.response);
  });

  it('accepts only safe nonnegative decimal retry numbers', async () => {
    let cases = [
      { value: '0', expected: { number: 0 } },
      { value: '42', expected: { number: 42 } },
      { value: '-1', expected: null },
      { value: '+1', expected: null },
      { value: '1.0', expected: null },
      { value: '1e2', expected: null },
      { value: '9007199254740992', expected: null }
    ];

    for (let testCase of cases) {
      let params = new URLSearchParams({ command: '/retry' });
      let { request } = formRequest(params, { 'x-slack-retry-num': testCase.value });
      let result = await invokeReadingExactlyOnce('verify_slack_slash_command_v0', request);
      expect(result.inputs[0]?.slack.retry, testCase.value).toEqual(testCase.expected);
    }
  });

  it('maps no SSL-check input and leaves acknowledgement rendering to the Hub', async () => {
    let params = new URLSearchParams({
      ssl_check: '1',
      token: 'legacy-ssl-token'
    });
    let { request } = formRequest(params);

    let result = await invokeReadingExactlyOnce('verify_slack_ssl_check_v0', request);

    expect(result.inputs).toEqual([]);
    expectNoProviderResponse(result.response);
  });
});
