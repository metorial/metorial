import {
  createLocalSlateTestClient,
  expectSlateContract,
  expectToolCall,
  mapSlateTriggerEvent,
  pollSlateTriggerGroupEvents,
  processSlateTriggerGroupWebhook,
  registerSlateTriggerGroupWebhook,
  unregisterSlateTriggerGroupWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import {
  signBody,
  signTimestampedBody,
  TEST_SIGNATURE_HEADER,
  TEST_TIMESTAMP_HEADER
} from './lib/hmac';
import { buildAccountRoutingMatcher } from './lib/matchers';

let ACCOUNT_ID = 'acc-1';
let WORKSPACE_ID = 'ws-1';
let TOKEN = 'secret-token';
let MATCHER = buildAccountRoutingMatcher({
  accountId: ACCOUNT_ID,
  workspaceId: WORKSPACE_ID
});
let MANUAL_SIGNING_SECRET = 'manual-signing-secret';
let AUTO_WEBHOOK_URL = 'https://example.com/hooks/test-triggers/auto';
let MANUAL_WEBHOOK_URL = 'https://example.com/hooks/test-triggers/manual';

(globalThis as typeof globalThis & { expect?: typeof expect }).expect = expect;

let createTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: { workspaceId: WORKSPACE_ID },
      auth: {
        authenticationMethodId: 'token',
        output: { token: TOKEN, accountId: ACCOUNT_ID }
      }
    }
  });

let decodeResponseBody = (response: {
  body?: { encoding: 'base64'; content: string } | null;
}) => Buffer.from(response.body?.content ?? '', 'base64').toString();

describe('test-triggers contract', () => {
  it('registers every trigger group type, trigger, auth method, and tool', async () => {
    expect(provider.triggerGroups.map(group => group.key)).toEqual([
      'poll_events',
      'auto_webhook',
      'manual_webhook'
    ]);
    expect(
      provider.actions.filter(action => action.type === 'trigger').map(action => action.key)
    ).toEqual([
      'poll_time',
      'poll_status',
      'auto_webhook_echo',
      'auto_webhook_created',
      'manual_webhook_echo'
    ]);

    await expectSlateContract({
      client: createTestClient(),
      provider: {
        id: 'test-triggers',
        name: 'Test Triggers'
      },
      toolIds: ['whoami'],
      triggerGroupIds: ['poll_events', 'auto_webhook', 'manual_webhook'],
      authMethodIds: ['token'],
      tools: [{ id: 'whoami', readOnly: true, destructive: false }],
      triggerGroups: [
        { id: 'poll_events', invocationType: 'polling' },
        { id: 'auto_webhook', invocationType: 'webhook' },
        { id: 'manual_webhook', invocationType: 'webhook' }
      ]
    });
  });

  it('returns routing matchers from auth and config for every trigger group', async () => {
    let client = createTestClient();

    for (let triggerGroupId of ['poll_events', 'auto_webhook', 'manual_webhook']) {
      let routingMatchers = await client.getTriggerGroupRoutingMatchers(triggerGroupId);
      expect(routingMatchers.matchers).toEqual([MATCHER]);
    }
  });

  it('returns the authenticated account from whoami', async () => {
    await expectToolCall({
      client: createTestClient(),
      toolId: 'whoami',
      input: {},
      output: {
        accountId: ACCOUNT_ID,
        workspaceId: WORKSPACE_ID
      }
    });
  });

  it('polls time and status events, then only time events on later runs', async () => {
    let client = createTestClient();

    let initialPoll = await pollSlateTriggerGroupEvents({
      client,
      triggerGroupId: 'poll_events'
    });

    expect(initialPoll.events).toHaveLength(2);
    expect(initialPoll.events[0]).toMatchObject({
      payload: { kind: 'time', accountId: ACCOUNT_ID, workspaceId: WORKSPACE_ID },
      triggerIds: ['poll_time']
    });
    expect(initialPoll.events[1]).toMatchObject({
      payload: { kind: 'status', status: 'ok', accountId: ACCOUNT_ID, workspaceId: WORKSPACE_ID },
      triggerIds: ['poll_status']
    });

    let mappedTime = await mapSlateTriggerEvent({
      client,
      triggerId: 'poll_time',
      input: initialPoll.events[0]!.payload,
      type: 'test.poll.time'
    });
    expect(mappedTime.output).toMatchObject({
      accountId: ACCOUNT_ID,
      workspaceId: WORKSPACE_ID
    });

    let mappedStatus = await mapSlateTriggerEvent({
      client,
      triggerId: 'poll_status',
      input: initialPoll.events[1]!.payload,
      type: 'test.poll.status',
      output: { status: 'ok' }
    });
    expect(mappedStatus.output).toMatchObject({
      status: 'ok',
      accountId: ACCOUNT_ID
    });

    let repeatedPoll = await pollSlateTriggerGroupEvents({
      client,
      triggerGroupId: 'poll_events',
      state: initialPoll.updatedState
    });
    expect(repeatedPoll.events).toHaveLength(1);
    expect(repeatedPoll.events[0]).toMatchObject({
      payload: { kind: 'time' },
      triggerIds: ['poll_time']
    });
    expect(repeatedPoll.updatedState).toMatchObject({ statusEmitted: true });
  });

  it('lists auto-registration webhook targets across pages and registers them', async () => {
    let client = createTestClient();

    let firstPage = await client.listTriggerGroupWebhookTargets({
      triggerGroupId: 'auto_webhook'
    });
    expect(firstPage.targets).toEqual([
      expect.objectContaining({
        webhookTargetIdentifier: 'acc-1:alpha',
        name: 'Channel Alpha',
        targetOwnership: 'single_user'
      }),
      expect.objectContaining({
        webhookTargetIdentifier: 'acc-1:beta',
        name: 'Channel Beta',
        targetOwnership: 'multi_user'
      })
    ]);
    expect(firstPage.nextPageToken).toBe('page-2');

    let secondPage = await client.listTriggerGroupWebhookTargets({
      triggerGroupId: 'auto_webhook',
      pageToken: 'page-2'
    });
    expect(secondPage.targets).toEqual([
      expect.objectContaining({
        webhookTargetIdentifier: 'acc-1:gamma',
        targetOwnership: 'single_user'
      })
    ]);
    expect(secondPage.nextPageToken).toBeNull();

    let target = firstPage.targets[0]!;
    let registration = await registerSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'auto_webhook',
      webhookTargetIdentifier: target.webhookTargetIdentifier,
      webhookTargetPayload: target.webhookTargetPayload,
      webhookUrl: AUTO_WEBHOOK_URL
    });
    expect(registration.webhookRegistrationIdentifier).toBe('reg-acc-1:alpha');
    expect(registration.webhookRegistrationPayload).toMatchObject({
      channelId: 'alpha',
      accountId: ACCOUNT_ID,
      workspaceId: WORKSPACE_ID,
      webhookUrl: AUTO_WEBHOOK_URL
    });
    expect(typeof registration.webhookRegistrationPayload.secret).toBe('string');

    await unregisterSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'auto_webhook',
      webhookRegistrationIdentifier: registration.webhookRegistrationIdentifier,
      webhookRegistrationPayload: registration.webhookRegistrationPayload
    });
  });

  it('answers a Meta-style auto-webhook challenge without emitting events', async () => {
    let client = createTestClient();
    let result = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'auto_webhook',
      url: `${AUTO_WEBHOOK_URL}?hub.mode=subscribe&hub.challenge=challenge-value`,
      method: 'GET',
      webhookRegistrationPayload: {
        secret: 'unused',
        channelId: 'alpha',
        accountId: ACCOUNT_ID,
        workspaceId: WORKSPACE_ID
      }
    });

    expect(result.events).toEqual([]);
    expect(result.response).toMatchObject({ status: 200 });
    expect(decodeResponseBody(result.response!)).toBe('challenge-value');
  });

  it('rejects unsigned auto-webhook deliveries and routes signed ones', async () => {
    let client = createTestClient();
    let firstPage = await client.listTriggerGroupWebhookTargets({
      triggerGroupId: 'auto_webhook'
    });
    let target = firstPage.targets[0]!;
    let registration = await registerSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'auto_webhook',
      webhookTargetIdentifier: target.webhookTargetIdentifier,
      webhookTargetPayload: target.webhookTargetPayload,
      webhookUrl: AUTO_WEBHOOK_URL
    });
    let secret = registration.webhookRegistrationPayload.secret as string;
    let createdBody = JSON.stringify({
      id: 'evt-1',
      type: 'created',
      value: 'hello',
      accountId: ACCOUNT_ID,
      workspaceId: WORKSPACE_ID
    });

    let rejected = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'auto_webhook',
      url: AUTO_WEBHOOK_URL,
      body: createdBody,
      webhookRegistrationPayload: registration.webhookRegistrationPayload
    });
    expect(rejected.events).toEqual([]);
    expect(rejected.response).toMatchObject({ status: 401 });

    let handled = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'auto_webhook',
      url: AUTO_WEBHOOK_URL,
      headers: { [TEST_SIGNATURE_HEADER]: signBody(secret, createdBody) },
      body: createdBody,
      webhookRegistrationPayload: registration.webhookRegistrationPayload
    });
    expect(handled.events).toHaveLength(1);
    expect(handled.events[0]!.matchers).toEqual([MATCHER]);
    expect(handled.events[0]!.triggerIds).toEqual(
      expect.arrayContaining(['auto_webhook_echo', 'auto_webhook_created'])
    );
    expect(handled.events[0]!.idempotencyKey).toBe('evt-1');
    expect(handled.response).toMatchObject({
      status: 201,
      headers: expect.objectContaining({ 'x-test-webhook-response': 'auto' })
    });

    let mappedCreated = await mapSlateTriggerEvent({
      client,
      triggerId: 'auto_webhook_created',
      input: handled.events[0]!.payload,
      type: 'test.auto.created'
    });
    expect(mappedCreated.output).toMatchObject({
      id: 'evt-1',
      channelId: 'alpha',
      value: 'hello'
    });

    let ignoredBody = JSON.stringify({ type: 'ignore', id: 'evt-ignored' });
    let ignored = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'auto_webhook',
      url: AUTO_WEBHOOK_URL,
      headers: { [TEST_SIGNATURE_HEADER]: signBody(secret, ignoredBody) },
      body: ignoredBody,
      webhookRegistrationPayload: registration.webhookRegistrationPayload
    });
    expect(ignored.events[0]!.triggerIds).toEqual([]);
  });

  it('sets up and finishes a manual webhook registration, then processes signed events', async () => {
    let client = createTestClient();

    let setup = await client.setupTriggerGroupWebhookManually({
      triggerGroupId: 'manual_webhook',
      webhookUrl: MANUAL_WEBHOOK_URL
    });
    expect(setup.webhookSetupDocument).toContain(MANUAL_WEBHOOK_URL);
    expect(setup.partialWebhookRegistrationPayload).toMatchObject({
      webhookUrl: MANUAL_WEBHOOK_URL
    });

    let finished = await client.finishTriggerGroupWebhookManualSetup({
      triggerGroupId: 'manual_webhook',
      webhookUrl: MANUAL_WEBHOOK_URL,
      partialWebhookRegistrationPayload: setup.partialWebhookRegistrationPayload,
      userWebhookRegistrationPayload: { signingSecret: MANUAL_SIGNING_SECRET }
    });
    expect(finished.webhookRegistrationPayload).toEqual({
      signingSecret: MANUAL_SIGNING_SECRET,
      webhookUrl: MANUAL_WEBHOOK_URL
    });

    let challengeBody = JSON.stringify({
      type: 'url_verification',
      challenge: 'manual-challenge'
    });
    let challengeTimestamp = String(Math.floor(Date.now() / 1000));
    let challenge = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'manual_webhook',
      url: MANUAL_WEBHOOK_URL,
      headers: {
        [TEST_TIMESTAMP_HEADER]: challengeTimestamp,
        [TEST_SIGNATURE_HEADER]: signTimestampedBody(
          MANUAL_SIGNING_SECRET,
          challengeTimestamp,
          challengeBody
        )
      },
      body: challengeBody,
      webhookRegistrationPayload: finished.webhookRegistrationPayload
    });
    expect(challenge.events).toEqual([]);
    expect(JSON.parse(decodeResponseBody(challenge.response!))).toEqual({
      challenge: 'manual-challenge'
    });

    let eventBody = JSON.stringify({
      id: 'manual-1',
      type: 'echo',
      accountId: ACCOUNT_ID,
      workspaceId: WORKSPACE_ID,
      value: 'payload'
    });
    let eventTimestamp = String(Math.floor(Date.now() / 1000));
    let handled = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'manual_webhook',
      url: MANUAL_WEBHOOK_URL,
      headers: {
        [TEST_TIMESTAMP_HEADER]: eventTimestamp,
        [TEST_SIGNATURE_HEADER]: signTimestampedBody(
          MANUAL_SIGNING_SECRET,
          eventTimestamp,
          eventBody
        )
      },
      body: eventBody,
      webhookRegistrationPayload: finished.webhookRegistrationPayload
    });
    expect(handled.events).toHaveLength(1);
    expect(handled.events[0]!.matchers).toEqual([MATCHER]);
    expect(handled.events[0]!.triggerIds).toEqual(['manual_webhook_echo']);

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'manual_webhook_echo',
      input: handled.events[0]!.payload,
      type: 'test.manual.echo'
    });
    expect(mapped.output).toMatchObject({
      accountId: ACCOUNT_ID,
      workspaceId: WORKSPACE_ID,
      value: 'payload'
    });

    let stale = await processSlateTriggerGroupWebhook({
      client,
      triggerGroupId: 'manual_webhook',
      url: MANUAL_WEBHOOK_URL,
      headers: {
        [TEST_TIMESTAMP_HEADER]: String(Math.floor(Date.now() / 1000) - 301),
        [TEST_SIGNATURE_HEADER]: 'v0=irrelevant'
      },
      body: eventBody,
      webhookRegistrationPayload: finished.webhookRegistrationPayload
    });
    expect(stale.events).toEqual([]);
    expect(stale.response).toMatchObject({ status: 401 });
  });
});
