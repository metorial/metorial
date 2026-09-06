import {
  createLocalSlateTestClient,
  getSlateContract,
  mapSlateTriggerEvent,
  processSlateTriggerGroupWebhook
} from '@slates/test';
import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';
import { SLACK_NO_ENTERPRISE } from '../lib/routingMatcher';

const SIGNING_SECRET = 'slack-signing-secret';
const APP_TOKEN = 'xapp-test-app-token';
const WEBHOOK_URL = 'https://example.com/callbacks/slack/events';
const WEBHOOK_REGISTRATION_PAYLOAD = { signingSecret: SIGNING_SECRET, appToken: APP_TOKEN };

let createSlackTestClient = (auth?: { output: Record<string, unknown> }) =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      ...(auth ? { auth: { authenticationMethodId: 'oauth', output: auth.output } } : {})
    }
  });

let signSlackRequest = (body: string, timestamp = Math.floor(Date.now() / 1_000)) => ({
  'x-slack-request-timestamp': String(timestamp),
  'x-slack-signature': `v0=${createHmac('sha256', SIGNING_SECRET)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex')}`
});

let decodeResponseBody = (response: {
  body?: { encoding: 'base64'; content: string } | null;
}) => Buffer.from(response.body?.content ?? '', 'base64').toString();

let processWebhook = (d: { body: string; headers?: Record<string, string> }) =>
  processSlateTriggerGroupWebhook({
    client: createSlackTestClient(),
    triggerGroupId: 'events',
    url: WEBHOOK_URL,
    headers: d.headers,
    body: d.body,
    webhookRegistrationPayload: WEBHOOK_REGISTRATION_PAYLOAD
  });

describe('Slack events trigger group contract', () => {
  it('registers the events trigger group and its triggers', async () => {
    let contract = await getSlateContract(createSlackTestClient());
    let triggerIds = contract.triggers.map(action => action.id);

    expect(contract.triggerGroups.map(group => group.id)).toContain('events');
    expect(triggerIds).toEqual(
      expect.arrayContaining([
        'new_message',
        'message_edited',
        'message_deleted',
        'app_mentioned',
        'new_reaction',
        'reaction_removed',
        'new_file',
        'member_joined_channel',
        'member_left_channel',
        'team_join',
        'channel_created',
        'channel_renamed',
        'channel_archived',
        'channel_unarchived',
        'user_change',
        'user_group_created',
        'user_group_updated',
        'user_group_members_changed'
      ])
    );
  });

  it('answers the URL verification challenge synchronously', async () => {
    let body = JSON.stringify({ type: 'url_verification', challenge: 'challenge-value' });
    let result = await processWebhook({ body, headers: signSlackRequest(body) });

    expect(result.events).toEqual([]);
    expect(result.response).toMatchObject({ status: 200 });
    expect(JSON.parse(decodeResponseBody(result.response!))).toEqual({
      challenge: 'challenge-value'
    });
  });

  let signatureRejectionCases: { name: string; headers: Record<string, string> }[] = [
    { name: 'missing signature headers', headers: {} },
    {
      name: 'an invalid signature',
      headers: {
        'x-slack-request-timestamp': String(Math.floor(Date.now() / 1_000)),
        'x-slack-signature': 'v0=invalid'
      }
    },
    {
      name: 'a stale timestamp',
      headers: signSlackRequest(
        JSON.stringify({ type: 'event_callback' }),
        Math.floor(Date.now() / 1_000) - 301
      )
    }
  ];

  it.each(signatureRejectionCases)('rejects $name with a 401 and no events', async ({ headers }) => {
    let body = JSON.stringify({ type: 'event_callback' });
    let result = await processWebhook({ body, headers });

    expect(result.events).toEqual([]);
    expect(result.response).toMatchObject({ status: 401 });
  });

  it('routes a bot-authorized message event to the matcher a bot auth config would produce', async () => {
    let body = JSON.stringify({
      type: 'event_callback',
      event_id: 'Ev123',
      team_id: 'T123',
      event: { type: 'message', channel: 'C123', user: 'U999', text: 'hello', ts: '1710000000.0001' },
      authorizations: [{ team_id: 'T123', is_bot: true }]
    });

    let result = await processWebhook({ body, headers: signSlackRequest(body) });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.matchers).toEqual([
      { installType: 'bot', enterpriseId: SLACK_NO_ENTERPRISE, teamId: 'T123' }
    ]);
    expect(result.events[0]!.idempotencyKey).toBe('Ev123');

    // The exact same shape must come out of the auth-config side for a stored bot install on the
    // same team, or the Hub's hash-based routing will never match this event to that install.
    let routingMatchers = await createSlackTestClient({
      output: { token: 'xoxb-test-token', actorType: 'bot', teamId: 'T123' }
    }).getTriggerGroupRoutingMatchers('events');
    expect(routingMatchers.matchers).toEqual(result.events[0]!.matchers);
  });

  it('routes a user-authorized message event to the matcher a user auth config would produce', async () => {
    let body = JSON.stringify({
      type: 'event_callback',
      team_id: 'T123',
      event: { type: 'message', channel: 'C123', user: 'U555', text: 'hi', ts: '1710000000.0002' },
      authorizations: [{ team_id: 'T123', user_id: 'U555', is_bot: false }]
    });

    let result = await processWebhook({ body, headers: signSlackRequest(body) });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.matchers).toEqual([
      { installType: 'user', enterpriseId: SLACK_NO_ENTERPRISE, teamId: 'T123', userId: 'U555' }
    ]);

    let routingMatchers = await createSlackTestClient({
      output: { token: 'xoxp-test-token', actorType: 'user', teamId: 'T123', userId: 'U555' }
    }).getTriggerGroupRoutingMatchers('events');
    expect(routingMatchers.matchers).toEqual(result.events[0]!.matchers);
  });

  it('keys the matcher on enterpriseId for Enterprise Grid workspaces', async () => {
    let body = JSON.stringify({
      type: 'event_callback',
      team_id: 'T123',
      event: { type: 'message', channel: 'C123', user: 'U555', text: 'hi', ts: '1710000000.0003' },
      authorizations: [{ team_id: 'T123', enterprise_id: 'E123', is_bot: true }]
    });

    let result = await processWebhook({ body, headers: signSlackRequest(body) });
    expect(result.events[0]!.matchers).toEqual([
      { installType: 'bot', enterpriseId: 'E123', teamId: 'T123' }
    ]);

    let routingMatchers = await createSlackTestClient({
      output: { token: 'xoxb-test-token', actorType: 'bot', teamId: 'T123', enterpriseId: 'E123' }
    }).getTriggerGroupRoutingMatchers('events');
    expect(routingMatchers.matchers).toEqual(result.events[0]!.matchers);
  });

  it('drops an authorization with no resolvable team id instead of emitting a malformed matcher', async () => {
    let body = JSON.stringify({
      type: 'event_callback',
      event: { type: 'message', channel: 'C123', text: 'hi', ts: '1710000000.0004' },
      authorizations: [{ enterprise_id: 'E123', is_bot: true }]
    });

    let result = await processWebhook({ body, headers: signSlackRequest(body) });
    expect(result.events).toEqual([]);
  });

  it('maps a routed message event to the trigger output', async () => {
    let body = JSON.stringify({
      type: 'event_callback',
      team_id: 'T123',
      event: { type: 'message', channel: 'C789', text: 'retry me', ts: '1710000002.000300' },
      authorizations: [{ team_id: 'T123', is_bot: true }]
    });

    let client = createSlackTestClient({
      output: { token: 'xoxb-test-token', actorType: 'bot', teamId: 'T123' }
    });
    let result = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'events',
      url: WEBHOOK_URL,
      headers: signSlackRequest(body),
      body,
      webhookRegistrationPayload: WEBHOOK_REGISTRATION_PAYLOAD
    });

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'new_message',
      input: result.events[0]!.payload
    });

    expect(mapped.id).toBe('C789-1710000002.000300');
    expect(mapped.output).toMatchObject({
      messageTs: '1710000002.000300',
      channelId: 'C789',
      text: 'retry me'
    });
  });

  it('routes and maps an app_mention event to the app_mentioned trigger', async () => {
    let body = JSON.stringify({
      type: 'event_callback',
      team_id: 'T123',
      event: { type: 'app_mention', channel: 'C456', user: 'U777', text: '<@BOT> hi', ts: '1710000003.0001' },
      authorizations: [{ team_id: 'T123', is_bot: true }]
    });

    let client = createSlackTestClient({
      output: { token: 'xoxb-test-token', actorType: 'bot', teamId: 'T123' }
    });
    let result = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'events',
      url: WEBHOOK_URL,
      headers: signSlackRequest(body),
      body,
      webhookRegistrationPayload: WEBHOOK_REGISTRATION_PAYLOAD
    });

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'app_mentioned',
      input: result.events[0]!.payload
    });

    expect(mapped.id).toBe('C456-1710000003.0001');
    expect(mapped.output).toMatchObject({ channelId: 'C456', userId: 'U777', text: '<@BOT> hi' });
  });

  it('routes and maps a team_join event to the team_join trigger', async () => {
    let body = JSON.stringify({
      type: 'event_callback',
      team_id: 'T123',
      event: {
        type: 'team_join',
        user: { id: 'U888', team_id: 'T123', name: 'newbie', profile: { email: 'newbie@example.com' } }
      },
      authorizations: [{ team_id: 'T123', is_bot: true }]
    });

    let client = createSlackTestClient({
      output: { token: 'xoxb-test-token', actorType: 'bot', teamId: 'T123' }
    });
    let result = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'events',
      url: WEBHOOK_URL,
      headers: signSlackRequest(body),
      body,
      webhookRegistrationPayload: WEBHOOK_REGISTRATION_PAYLOAD
    });

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'team_join',
      input: result.events[0]!.payload
    });

    expect(mapped.output).toMatchObject({ userId: 'U888', name: 'newbie', email: 'newbie@example.com' });
  });
});
