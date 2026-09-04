import { createHmac } from 'node:crypto';
import {
  createLocalSlateTestClient,
  expectSlateError,
  handleSlateTriggerWebhook,
  registerSlateTriggerWebhook,
  unregisterSlateTriggerWebhook
} from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';

(globalThis as typeof globalThis & { expect?: typeof expect }).expect = expect;

let clickUpClientMocks = vi.hoisted(() => ({
  tokens: [] as string[],
  getWorkspaces: vi.fn(),
  createWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  getTask: vi.fn()
}));

vi.mock('../lib/client', () => ({
  ClickUpClient: class {
    constructor(token: string) {
      clickUpClientMocks.tokens.push(token);
    }

    getWorkspaces(...args: unknown[]) {
      return clickUpClientMocks.getWorkspaces(...args);
    }

    createWebhook(...args: unknown[]) {
      return clickUpClientMocks.createWebhook(...args);
    }

    deleteWebhook(...args: unknown[]) {
      return clickUpClientMocks.deleteWebhook(...args);
    }

    getTask(...args: unknown[]) {
      return clickUpClientMocks.getTask(...args);
    }
  }
}));

let createTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

let registrationDetails = {
  webhooks: [
    { workspaceId: 'workspace-1', webhookId: 'webhook-1', secret: 'secret-1' },
    { workspaceId: 'workspace-2', webhookId: 'webhook-2', secret: 'secret-2' }
  ]
};

let signClickUpPayload = (body: string, secret: string) =>
  createHmac('sha256', secret).update(body).digest('hex');

let taskWebhookEvents = [
  'taskCreated',
  'taskUpdated',
  'taskDeleted',
  'taskPriorityUpdated',
  'taskStatusUpdated',
  'taskAssigneeUpdated',
  'taskDueDateUpdated',
  'taskTagUpdated',
  'taskMoved',
  'taskCommentPosted',
  'taskCommentUpdated',
  'taskTimeEstimateUpdated',
  'taskTimeTrackedUpdated'
];

let workspaceWebhookEvents = [
  'listCreated',
  'listUpdated',
  'listDeleted',
  'folderCreated',
  'folderUpdated',
  'folderDeleted',
  'spaceCreated',
  'spaceUpdated',
  'spaceDeleted',
  'goalCreated',
  'goalUpdated',
  'goalDeleted',
  'keyResultCreated',
  'keyResultUpdated',
  'keyResultDeleted'
];

beforeEach(() => {
  clickUpClientMocks.tokens.splice(0);
  clickUpClientMocks.getWorkspaces.mockReset();
  clickUpClientMocks.createWebhook.mockReset();
  clickUpClientMocks.deleteWebhook.mockReset();
  clickUpClientMocks.getTask.mockReset();
});

describe('ClickUp multi-workspace trigger contracts', () => {
  it.each([
    ['task_events', taskWebhookEvents],
    ['workspace_events', workspaceWebhookEvents]
  ] as const)('registers and unregisters %s across every Workspace', async (triggerId, events) => {
    clickUpClientMocks.getWorkspaces.mockResolvedValue([
      { id: 'workspace-1' },
      { id: 'workspace-2' }
    ]);
    clickUpClientMocks.createWebhook
      .mockResolvedValueOnce({ id: 'webhook-1', secret: 'secret-1' })
      .mockResolvedValueOnce({ id: 'webhook-2', secret: 'secret-2' });
    clickUpClientMocks.deleteWebhook.mockResolvedValue(undefined);
    let client = createTestClient();

    let registration = await registerSlateTriggerWebhook({
      client,
      triggerId,
      webhookBaseUrl: 'https://example.com/hooks/clickup'
    });

    expect(registration.registrationDetails).toEqual(registrationDetails);
    expect(clickUpClientMocks.tokens).toContain('test-token');
    expect(clickUpClientMocks.createWebhook).toHaveBeenNthCalledWith(1, 'workspace-1', {
      endpoint: 'https://example.com/hooks/clickup',
      events
    });
    expect(clickUpClientMocks.createWebhook).toHaveBeenNthCalledWith(2, 'workspace-2', {
      endpoint: 'https://example.com/hooks/clickup',
      events
    });

    await unregisterSlateTriggerWebhook({
      client,
      triggerId,
      webhookBaseUrl: 'https://example.com/hooks/clickup',
      registrationDetails: registration.registrationDetails
    });
    expect(clickUpClientMocks.deleteWebhook).toHaveBeenNthCalledWith(1, 'webhook-1');
    expect(clickUpClientMocks.deleteWebhook).toHaveBeenNthCalledWith(2, 'webhook-2');
  });

  it('maps task webhook requests and events with their Workspace ID', async () => {
    let client = createTestClient();
    let body = JSON.stringify({
      event: 'taskUpdated',
      webhook_id: 'webhook-2',
      task_id: 'task-1',
      history_items: [{ field: 'status', before: 'open', after: 'done' }]
    });
    let handled = await handleSlateTriggerWebhook({
      client,
      triggerId: 'task_events',
      url: 'https://example.com/hooks/clickup',
      registrationDetails,
      headers: { 'x-signature': signClickUpPayload(body, 'secret-2') },
      body
    });

    expect(handled.inputs).toMatchObject([
      {
        workspaceId: 'workspace-2',
        eventType: 'taskUpdated',
        webhookId: 'webhook-2',
        taskId: 'task-1'
      }
    ]);

    clickUpClientMocks.getTask.mockResolvedValue({
      id: 'task-1',
      name: 'Task one',
      url: 'https://app.clickup.com/t/task-1',
      status: { status: 'done' }
    });
    let mapped = await client.mapTriggerEvent('task_events', handled.inputs[0]!);

    expect(mapped).toMatchObject({
      type: 'task.updated',
      output: {
        workspaceId: 'workspace-2',
        taskId: 'task-1',
        taskName: 'Task one',
        status: 'done'
      }
    });
  });

  it('maps workspace webhook requests and events with their Workspace ID', async () => {
    let client = createTestClient();
    let body = JSON.stringify({
      event: 'listUpdated',
      webhook_id: 'webhook-1',
      list_id: 'list-1',
      history_items: [{ field: 'name', before: 'Old name', after: 'New name' }]
    });
    let handled = await handleSlateTriggerWebhook({
      client,
      triggerId: 'workspace_events',
      url: 'https://example.com/hooks/clickup',
      registrationDetails,
      headers: { 'x-signature': signClickUpPayload(body, 'secret-1') },
      body
    });

    expect(handled.inputs).toMatchObject([
      {
        workspaceId: 'workspace-1',
        eventType: 'listUpdated',
        webhookId: 'webhook-1',
        resourceId: 'list-1',
        resourceType: 'list'
      }
    ]);

    let mapped = await client.mapTriggerEvent('workspace_events', handled.inputs[0]!);
    expect(mapped).toMatchObject({
      type: 'list.updated',
      output: {
        workspaceId: 'workspace-1',
        resourceId: 'list-1',
        resourceType: 'list',
        resourceName: 'New name'
      }
    });
  });

  it.each([
    'task_events',
    'workspace_events'
  ])('rejects missing and unknown webhook IDs for %s', async triggerId => {
    let client = createTestClient();
    let payload =
      triggerId === 'task_events'
        ? { event: 'taskUpdated', task_id: 'task-1' }
        : { event: 'listUpdated', list_id: 'list-1' };

    await expectSlateError(
      () =>
        handleSlateTriggerWebhook({
          client,
          triggerId,
          url: 'https://example.com/hooks/clickup',
          registrationDetails,
          body: JSON.stringify(payload)
        }),
      /not part of this trigger registration/
    );

    await expectSlateError(
      () =>
        handleSlateTriggerWebhook({
          client,
          triggerId,
          url: 'https://example.com/hooks/clickup',
          registrationDetails,
          body: JSON.stringify({ ...payload, webhook_id: 'unknown-webhook' })
        }),
      /not part of this trigger registration/
    );
  });

  it.each([
    ['task_events', { task_id: 'task-1' }],
    ['workspace_events', { list_id: 'list-1' }]
  ] as const)('validates webhook membership before filtering incomplete %s payloads', async (triggerId, incompletePayload) => {
    let client = createTestClient();

    await expectSlateError(
      () =>
        handleSlateTriggerWebhook({
          client,
          triggerId,
          url: 'https://example.com/hooks/clickup',
          registrationDetails,
          body: JSON.stringify(incompletePayload)
        }),
      /not part of this trigger registration/
    );

    let knownIncompleteBody = JSON.stringify({
      ...incompletePayload,
      webhook_id: 'webhook-1'
    });
    let filtered = await handleSlateTriggerWebhook({
      client,
      triggerId,
      url: 'https://example.com/hooks/clickup',
      registrationDetails,
      headers: {
        'x-signature': signClickUpPayload(knownIncompleteBody, 'secret-1')
      },
      body: knownIncompleteBody
    });
    expect(filtered.inputs).toEqual([]);
  });

  it.each([
    ['task_events', { event: 'taskUpdated', webhook_id: 'webhook-1', task_id: 'task-1' }],
    ['workspace_events', { event: 'listUpdated', webhook_id: 'webhook-1', list_id: 'list-1' }]
  ] as const)('requires a valid ClickUp signature for %s', async (triggerId, payload) => {
    let client = createTestClient();
    let body = JSON.stringify(payload);

    let valid = await handleSlateTriggerWebhook({
      client,
      triggerId,
      url: 'https://example.com/hooks/clickup',
      registrationDetails,
      headers: { 'x-signature': signClickUpPayload(body, 'secret-1') },
      body
    });
    expect(valid.inputs).toHaveLength(1);

    let missing = await handleSlateTriggerWebhook({
      client,
      triggerId,
      url: 'https://example.com/hooks/clickup',
      registrationDetails,
      body
    });
    expect(missing).toMatchObject({ inputs: [], response: { status: 401 } });

    let invalid = await handleSlateTriggerWebhook({
      client,
      triggerId,
      url: 'https://example.com/hooks/clickup',
      registrationDetails,
      headers: { 'x-signature': 'invalid-signature' },
      body
    });
    expect(invalid).toMatchObject({ inputs: [], response: { status: 401 } });

    let noSecret = await handleSlateTriggerWebhook({
      client,
      triggerId,
      url: 'https://example.com/hooks/clickup',
      registrationDetails: {
        webhooks: [{ workspaceId: 'workspace-1', webhookId: 'webhook-1' }]
      },
      headers: { 'x-signature': signClickUpPayload(body, 'secret-1') },
      body
    });
    expect(noSecret).toMatchObject({ inputs: [], response: { status: 401 } });
  });
});
