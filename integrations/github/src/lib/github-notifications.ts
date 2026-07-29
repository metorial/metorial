import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { GitHubClient, type GitHubClientConfig } from './client';

export const notificationFilterSchema = z.enum([
  'default',
  'include_read_notifications',
  'only_participating'
]);

export const notificationSchema = z.object({
  notificationID: z.string().describe('Notification thread ID'),
  unread: z.boolean().describe('Whether the notification is unread'),
  reason: z.string().nullable().describe('Why the notification was delivered'),
  updatedAt: z.string().nullable().describe('ISO 8601 time of the latest update'),
  lastReadAt: z.string().nullable().describe('ISO 8601 time the notification was last read'),
  subject: z.object({
    title: z.string().nullable().describe('Notification subject title'),
    type: z.string().nullable().describe('GitHub subject type'),
    apiUrl: z.string().nullable().describe('GitHub API URL for the subject'),
    latestCommentApiUrl: z
      .string()
      .nullable()
      .describe('GitHub API URL for the latest subject comment')
  }),
  repository: z.object({
    repositoryId: z.number().nullable().describe('Numeric repository ID'),
    nodeId: z.string().nullable().describe('GraphQL repository node ID'),
    owner: z.string().nullable().describe('Repository owner login'),
    name: z.string().nullable().describe('Repository name'),
    fullName: z.string().nullable().describe('Repository name in owner/repo form'),
    private: z.boolean().nullable().describe('Whether the repository is private'),
    htmlUrl: z.string().nullable().describe('Repository URL')
  }),
  apiUrl: z.string().nullable().describe('GitHub API URL for the notification'),
  subscriptionApiUrl: z
    .string()
    .nullable()
    .describe('GitHub API URL for the notification subscription')
});

export const notificationSubscriptionStateSchema = z.object({
  subscribed: z.boolean().nullable().describe('Whether notifications are subscribed'),
  ignored: z.boolean().nullable().describe('Whether notifications are ignored'),
  reason: z.string().nullable().describe('Subscription reason reported by GitHub')
});

export type NotificationFilter = z.infer<typeof notificationFilterSchema>;
export type NotificationSubscriptionAction = 'delete' | 'ignore' | 'watch';

type RepositorySelection = {
  owner: string;
  repo: string;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const stringOrNull = (value: unknown) => (typeof value === 'string' ? value : null);
const numberOrNull = (value: unknown) => (typeof value === 'number' ? value : null);
const booleanOrNull = (value: unknown) => (typeof value === 'boolean' ? value : null);

export const mapGitHubNotification = (value: unknown) => {
  const notification = asRecord(value);
  const notificationID = stringOrNull(notification.id);
  if (!notificationID) {
    throw createApiServiceError('GitHub returned a notification without a thread ID.', {
      reason: 'github_notification_response_invalid'
    });
  }

  const subject = asRecord(notification.subject);
  const repository = asRecord(notification.repository);
  const repositoryOwner = asRecord(repository.owner);

  return {
    notificationID,
    unread: notification.unread === true,
    reason: stringOrNull(notification.reason),
    updatedAt: stringOrNull(notification.updated_at),
    lastReadAt: stringOrNull(notification.last_read_at),
    subject: {
      title: stringOrNull(subject.title),
      type: stringOrNull(subject.type),
      apiUrl: stringOrNull(subject.url),
      latestCommentApiUrl: stringOrNull(subject.latest_comment_url)
    },
    repository: {
      repositoryId: numberOrNull(repository.id),
      nodeId: stringOrNull(repository.node_id),
      owner: stringOrNull(repositoryOwner.login),
      name: stringOrNull(repository.name),
      fullName: stringOrNull(repository.full_name),
      private: booleanOrNull(repository.private),
      htmlUrl: stringOrNull(repository.html_url)
    },
    apiUrl: stringOrNull(notification.url),
    subscriptionApiUrl: stringOrNull(notification.subscription_url)
  };
};

export const mapNotificationSubscriptionState = (
  value: unknown,
  action: Exclude<NotificationSubscriptionAction, 'delete'>
) => {
  const subscription = asRecord(value);
  return {
    subscribed: booleanOrNull(subscription.subscribed) ?? (action === 'watch' ? true : null),
    ignored: booleanOrNull(subscription.ignored) ?? action === 'ignore',
    reason: stringOrNull(subscription.reason)
  };
};

export const requireRepositoryPair = (
  owner: string | undefined,
  repo: string | undefined
): RepositorySelection | null => {
  if (owner === undefined && repo === undefined) return null;
  if (!owner?.trim() || !repo?.trim()) {
    throw createApiServiceError('owner and repo must be provided together.', {
      reason: 'github_notification_repository_pair_required'
    });
  }
  return { owner, repo };
};

const rfc3339Schema = z.iso.datetime({ offset: true });

export const requireRfc3339 = (value: string | undefined, field: string) => {
  if (value === undefined) return undefined;
  if (!rfc3339Schema.safeParse(value).success) {
    throw createApiServiceError(`${field} must be a valid RFC3339 timestamp.`, {
      reason: 'github_notification_timestamp_invalid'
    });
  }
  return value;
};

export class GitHubNotificationsClient {
  private client: GitHubClient;

  constructor(config: GitHubClientConfig) {
    this.client = new GitHubClient(config);
  }

  private encode(value: string) {
    return encodeURIComponent(value);
  }

  private async read(path: string, params: Record<string, unknown>, operation: string) {
    return this.client.requestRest<unknown>({
      method: 'GET',
      path,
      query: params,
      operation,
      reason: 'github_notifications_api_failed'
    });
  }

  private async write(
    method: 'delete' | 'patch' | 'put',
    path: string,
    data: Record<string, unknown> | undefined,
    operation: string
  ) {
    return this.client.requestRest<unknown, Record<string, unknown>>({
      method: method === 'delete' ? 'DELETE' : method === 'patch' ? 'PATCH' : 'PUT',
      path,
      body: data,
      operation,
      reason: 'github_notifications_api_failed'
    });
  }

  getRepositoryHtmlUrl(owner: string, repo: string) {
    return this.client.getRepositoryHtmlUrl(owner, repo);
  }

  async listNotifications(params: {
    filter?: NotificationFilter;
    since?: string;
    before?: string;
    owner?: string;
    repo?: string;
    page?: number;
    perPage?: number;
  }) {
    const repository = requireRepositoryPair(params.owner, params.repo);
    const path = repository
      ? `/repos/${this.encode(repository.owner)}/${this.encode(repository.repo)}/notifications`
      : '/notifications';
    const response = await this.read(
      path,
      {
        all: params.filter === 'include_read_notifications' ? true : undefined,
        participating: params.filter === 'only_participating' ? true : undefined,
        since: params.since,
        before: params.before,
        page: params.page,
        per_page: params.perPage
      },
      'list notifications'
    );
    return Array.isArray(response) ? response : [];
  }

  async getNotificationDetails(notificationID: string) {
    return this.read(
      `/notifications/threads/${this.encode(notificationID)}`,
      {},
      'get notification details'
    );
  }

  async dismissNotification(threadID: string, state: 'done' | 'read') {
    const path = `/notifications/threads/${this.encode(threadID)}`;
    if (state === 'done') {
      await this.write('delete', path, undefined, 'mark notification as done');
      return;
    }
    await this.write('patch', path, {}, 'mark notification as read');
  }

  async markAllNotificationsRead(params: {
    lastReadAt: string;
    owner?: string;
    repo?: string;
  }) {
    const repository = requireRepositoryPair(params.owner, params.repo);
    const path = repository
      ? `/repos/${this.encode(repository.owner)}/${this.encode(repository.repo)}/notifications`
      : '/notifications';
    await this.write(
      'put',
      path,
      { last_read_at: params.lastReadAt },
      'mark notifications read'
    );
  }

  async manageNotificationSubscription(
    notificationID: string,
    action: NotificationSubscriptionAction
  ) {
    const path = `/notifications/threads/${this.encode(notificationID)}/subscription`;
    if (action === 'delete') {
      await this.write('delete', path, undefined, 'delete notification subscription');
      return null;
    }
    return this.write(
      'put',
      path,
      action === 'ignore'
        ? { ignored: true }
        : {
            ignored: false,
            subscribed: true
          },
      `${action} notification subscription`
    );
  }

  async manageRepositoryNotificationSubscription(
    owner: string,
    repo: string,
    action: NotificationSubscriptionAction
  ) {
    const path = `/repos/${this.encode(owner)}/${this.encode(repo)}/subscription`;
    if (action === 'delete') {
      await this.write(
        'delete',
        path,
        undefined,
        'delete repository notification subscription'
      );
      return null;
    }
    return this.write(
      'put',
      path,
      action === 'ignore'
        ? { ignored: true }
        : {
            ignored: false,
            subscribed: true
          },
      `${action} repository notification subscription`
    );
  }
}
