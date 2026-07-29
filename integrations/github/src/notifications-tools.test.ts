import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GitHubNotificationsClient } from './lib/github-notifications';
import { dismissNotification } from './tools/dismiss-notification';
import { getNotificationDetails } from './tools/get-notification-details';
import { listNotifications } from './tools/list-notifications';
import { manageNotificationSubscription } from './tools/manage-notification-subscription';
import { manageRepositoryNotificationSubscription } from './tools/manage-repository-notification-subscription';
import { markAllNotificationsRead } from './tools/mark-all-notifications-read';

const notification = {
  id: '123',
  unread: true,
  reason: 'mention',
  updated_at: '2026-07-29T12:00:00Z',
  last_read_at: null,
  subject: {
    title: 'Please review this change',
    type: 'PullRequest',
    url: 'https://api.github.com/repos/octocat/hello-world/pulls/7',
    latest_comment_url: 'https://api.github.com/repos/octocat/hello-world/issues/comments/99'
  },
  repository: {
    id: 42,
    node_id: 'R_42',
    owner: { login: 'octocat' },
    name: 'hello-world',
    full_name: 'octocat/hello-world',
    private: false,
    html_url: 'https://github.com/octocat/hello-world'
  },
  url: 'https://api.github.com/notifications/threads/123',
  subscription_url: 'https://api.github.com/notifications/threads/123/subscription'
};

const context = {
  auth: {
    token: 'test-token',
    instanceUrl: 'https://github.com'
  },
  config: {}
};

const invoke = (tool: any, input: Record<string, unknown>) =>
  tool.handleInvocation({ ...context, input });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub notification tool schemas', () => {
  const tools = [
    listNotifications,
    getNotificationDetails,
    dismissNotification,
    markAllNotificationsRead,
    manageNotificationSubscription,
    manageRepositoryNotificationSubscription
  ];

  it('uses the official names, MCP-compatible object schemas, notification scope, and short IDs', () => {
    for (const tool of tools) {
      expectMcpCompatibleToolSchema(tool);
      expect(`github-${tool.key}`.length).toBeLessThan(60);
      expect(tool.scopes).toEqual({ AND: [{ OR: ['notifications'] }] });
    }
    expect(tools.map(tool => tool.key)).toEqual([
      'list_notifications',
      'get_notification_details',
      'dismiss_notification',
      'mark_all_notifications_read',
      'manage_notification_subscription',
      'manage_repository_notification_subscription'
    ]);
    expect(markAllNotificationsRead.tags).toMatchObject({ destructive: true });
  });

  it('matches the official notification input fields and required parameters', () => {
    const listSchema = z.toJSONSchema(listNotifications.inputSchema) as any;
    expect(Object.keys(listSchema.properties)).toEqual([
      'filter',
      'since',
      'before',
      'owner',
      'repo',
      'page',
      'perPage'
    ]);
    expect(listSchema.required).toBeUndefined();
    expect(listSchema.properties.filter.enum).toEqual([
      'default',
      'include_read_notifications',
      'only_participating'
    ]);
    expect(listSchema.properties.page.minimum).toBe(1);
    expect(listSchema.properties.perPage).toMatchObject({ minimum: 1, maximum: 100 });

    const detailSchema = z.toJSONSchema(getNotificationDetails.inputSchema) as any;
    expect(Object.keys(detailSchema.properties)).toEqual(['notificationID']);
    expect(detailSchema.required).toEqual(['notificationID']);

    const dismissSchema = z.toJSONSchema(dismissNotification.inputSchema) as any;
    expect(Object.keys(dismissSchema.properties)).toEqual(['threadID', 'state']);
    expect(dismissSchema.required).toEqual(['threadID', 'state']);
    expect(dismissSchema.properties.state.enum).toEqual(['read', 'done']);

    const markAllSchema = z.toJSONSchema(markAllNotificationsRead.inputSchema) as any;
    expect(Object.keys(markAllSchema.properties)).toEqual(['lastReadAt', 'owner', 'repo']);
    expect(markAllSchema.required).toBeUndefined();

    const threadSubscriptionSchema = z.toJSONSchema(
      manageNotificationSubscription.inputSchema
    ) as any;
    expect(Object.keys(threadSubscriptionSchema.properties)).toEqual([
      'notificationID',
      'action'
    ]);
    expect(threadSubscriptionSchema.required).toEqual(['notificationID', 'action']);
    expect(threadSubscriptionSchema.properties.action.enum).toEqual([
      'ignore',
      'watch',
      'delete'
    ]);

    const repositorySubscriptionSchema = z.toJSONSchema(
      manageRepositoryNotificationSubscription.inputSchema
    ) as any;
    expect(Object.keys(repositorySubscriptionSchema.properties)).toEqual([
      'owner',
      'repo',
      'action'
    ]);
    expect(repositorySubscriptionSchema.required).toEqual(['owner', 'repo', 'action']);
    expect(repositorySubscriptionSchema.properties.action.enum).toEqual([
      'ignore',
      'watch',
      'delete'
    ]);
  });
});

describe('GitHub notification tool behavior', () => {
  it('maps list and detail results to useful notification metadata', async () => {
    const list = vi
      .spyOn(GitHubNotificationsClient.prototype, 'listNotifications')
      .mockResolvedValue([notification]);
    const get = vi
      .spyOn(GitHubNotificationsClient.prototype, 'getNotificationDetails')
      .mockResolvedValue(notification);

    const listResult = await invoke(listNotifications, {
      owner: 'octocat',
      repo: 'hello-world',
      filter: 'only_participating',
      since: '2026-07-28T00:00:00Z',
      before: '2026-07-30T00:00:00Z',
      page: 2,
      perPage: 10
    });
    expect(list).toHaveBeenCalledWith({
      owner: 'octocat',
      repo: 'hello-world',
      filter: 'only_participating',
      since: '2026-07-28T00:00:00Z',
      before: '2026-07-30T00:00:00Z',
      page: 2,
      perPage: 10
    });
    expect(listResult.output).toMatchObject({
      filter: 'only_participating',
      owner: 'octocat',
      repo: 'hello-world',
      page: 2,
      perPage: 10,
      returnedCount: 1,
      notifications: [
        {
          notificationID: '123',
          unread: true,
          reason: 'mention',
          subject: {
            title: 'Please review this change',
            type: 'PullRequest'
          },
          repository: {
            repositoryId: 42,
            owner: 'octocat',
            fullName: 'octocat/hello-world'
          }
        }
      ]
    });

    const detailResult = await invoke(getNotificationDetails, {
      notificationID: '123'
    });
    expect(get).toHaveBeenCalledWith('123');
    expect(detailResult.output.notification).toMatchObject({
      notificationID: '123',
      subject: { type: 'PullRequest' }
    });
  });

  it('maps dismiss and mark-all operations to the requested notification scope', async () => {
    const dismiss = vi
      .spyOn(GitHubNotificationsClient.prototype, 'dismissNotification')
      .mockResolvedValue(undefined);
    const markAll = vi
      .spyOn(GitHubNotificationsClient.prototype, 'markAllNotificationsRead')
      .mockResolvedValue(undefined);

    const dismissResult = await invoke(dismissNotification, {
      threadID: '123',
      state: 'done'
    });
    expect(dismiss).toHaveBeenCalledWith('123', 'done');
    expect(dismissResult.output).toEqual({ threadID: '123', state: 'done' });

    const markAllResult = await invoke(markAllNotificationsRead, {
      owner: 'octocat',
      repo: 'hello-world',
      lastReadAt: '2026-07-29T12:00:00Z'
    });
    expect(markAll).toHaveBeenCalledWith({
      owner: 'octocat',
      repo: 'hello-world',
      lastReadAt: '2026-07-29T12:00:00Z'
    });
    expect(markAllResult.output).toEqual({
      scope: 'repository',
      owner: 'octocat',
      repo: 'hello-world',
      repositoryHtmlUrl: 'https://github.com/octocat/hello-world',
      lastReadAt: '2026-07-29T12:00:00Z'
    });
  });

  it('maps thread and repository subscription actions', async () => {
    const manageThread = vi
      .spyOn(GitHubNotificationsClient.prototype, 'manageNotificationSubscription')
      .mockResolvedValue({
        subscribed: true,
        ignored: false,
        reason: 'subscribed'
      });
    const manageRepository = vi
      .spyOn(GitHubNotificationsClient.prototype, 'manageRepositoryNotificationSubscription')
      .mockResolvedValue(null);

    const threadResult = await invoke(manageNotificationSubscription, {
      notificationID: '123',
      action: 'watch'
    });
    expect(manageThread).toHaveBeenCalledWith('123', 'watch');
    expect(threadResult.output).toEqual({
      notificationID: '123',
      action: 'watch',
      deleted: false,
      subscription: {
        subscribed: true,
        ignored: false,
        reason: 'subscribed'
      }
    });

    const repositoryResult = await invoke(manageRepositoryNotificationSubscription, {
      owner: 'octocat',
      repo: 'hello-world',
      action: 'delete'
    });
    expect(manageRepository).toHaveBeenCalledWith('octocat', 'hello-world', 'delete');
    expect(repositoryResult.output).toEqual({
      owner: 'octocat',
      repo: 'hello-world',
      repositoryHtmlUrl: 'https://github.com/octocat/hello-world',
      action: 'delete',
      deleted: true,
      subscription: null
    });
  });

  it('rejects incomplete repository scopes and invalid timestamps before API calls', async () => {
    const list = vi.spyOn(GitHubNotificationsClient.prototype, 'listNotifications');
    const markAll = vi.spyOn(GitHubNotificationsClient.prototype, 'markAllNotificationsRead');

    await expect(
      invoke(listNotifications, {
        owner: 'octocat'
      })
    ).rejects.toThrow('owner and repo must be provided together');
    await expect(
      invoke(markAllNotificationsRead, {
        owner: 'octocat'
      })
    ).rejects.toThrow('owner and repo must be provided together');
    await expect(
      invoke(listNotifications, {
        since: 'yesterday'
      })
    ).rejects.toThrow('since must be a valid RFC3339 timestamp');
    await expect(
      invoke(markAllNotificationsRead, {
        lastReadAt: '2026-02-30T00:00:00Z'
      })
    ).rejects.toThrow('lastReadAt must be a valid RFC3339 timestamp');

    expect(list).not.toHaveBeenCalled();
    expect(markAll).not.toHaveBeenCalled();
  });
});

describe('GitHub notification REST mappings', () => {
  const createClient = () => {
    const requestRest = vi.fn();
    const client = new GitHubNotificationsClient(context.auth);
    (client as any).client = {
      requestRest,
      getRepositoryHtmlUrl: (owner: string, repo: string) =>
        `https://github.com/${owner}/${repo}`
    };
    return { client, requestRest };
  };

  it('maps list and detail requests to GitHub notification endpoints', async () => {
    const { client, requestRest } = createClient();
    requestRest.mockResolvedValueOnce([]).mockResolvedValueOnce(notification);

    await client.listNotifications({
      owner: 'octo cat',
      repo: 'hello/world',
      filter: 'include_read_notifications',
      since: '2026-07-28T00:00:00Z',
      before: '2026-07-30T00:00:00Z',
      page: 2,
      perPage: 10
    });
    expect(requestRest).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: '/repos/octo%20cat/hello%2Fworld/notifications',
      query: {
        all: true,
        participating: undefined,
        since: '2026-07-28T00:00:00Z',
        before: '2026-07-30T00:00:00Z',
        page: 2,
        per_page: 10
      },
      operation: 'list notifications',
      reason: 'github_notifications_api_failed'
    });

    await client.getNotificationDetails('thread/123');
    expect(requestRest).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/notifications/threads/thread%2F123',
      query: {},
      operation: 'get notification details',
      reason: 'github_notifications_api_failed'
    });
  });

  it('maps dismiss and mark-all requests to the official methods and bodies', async () => {
    const { client, requestRest } = createClient();
    requestRest.mockResolvedValue(undefined);

    await client.dismissNotification('123', 'read');
    await client.dismissNotification('123', 'done');
    await client.markAllNotificationsRead({
      owner: 'octocat',
      repo: 'hello-world',
      lastReadAt: '2026-07-29T12:00:00Z'
    });

    expect(requestRest).toHaveBeenNthCalledWith(1, {
      method: 'PATCH',
      path: '/notifications/threads/123',
      body: {},
      operation: 'mark notification as read',
      reason: 'github_notifications_api_failed'
    });
    expect(requestRest).toHaveBeenNthCalledWith(2, {
      method: 'DELETE',
      path: '/notifications/threads/123',
      body: undefined,
      operation: 'mark notification as done',
      reason: 'github_notifications_api_failed'
    });
    expect(requestRest).toHaveBeenNthCalledWith(3, {
      method: 'PUT',
      path: '/repos/octocat/hello-world/notifications',
      body: { last_read_at: '2026-07-29T12:00:00Z' },
      operation: 'mark notifications read',
      reason: 'github_notifications_api_failed'
    });
  });

  it('maps thread and repository subscriptions to the official endpoints', async () => {
    const { client, requestRest } = createClient();
    requestRest.mockResolvedValue({});

    await client.manageNotificationSubscription('123', 'ignore');
    await client.manageNotificationSubscription('123', 'watch');
    await client.manageRepositoryNotificationSubscription('octocat', 'hello-world', 'delete');

    expect(requestRest).toHaveBeenNthCalledWith(1, {
      method: 'PUT',
      path: '/notifications/threads/123/subscription',
      body: { ignored: true },
      operation: 'ignore notification subscription',
      reason: 'github_notifications_api_failed'
    });
    expect(requestRest).toHaveBeenNthCalledWith(2, {
      method: 'PUT',
      path: '/notifications/threads/123/subscription',
      body: { ignored: false, subscribed: true },
      operation: 'watch notification subscription',
      reason: 'github_notifications_api_failed'
    });
    expect(requestRest).toHaveBeenNthCalledWith(3, {
      method: 'DELETE',
      path: '/repos/octocat/hello-world/subscription',
      body: undefined,
      operation: 'delete repository notification subscription',
      reason: 'github_notifications_api_failed'
    });
  });
});
