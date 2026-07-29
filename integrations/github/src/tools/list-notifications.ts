import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  GitHubNotificationsClient,
  mapGitHubNotification,
  notificationFilterSchema,
  notificationSchema,
  requireRepositoryPair,
  requireRfc3339
} from '../lib/github-notifications';
import { spec } from '../spec';

export const listNotifications = SlateTool.create(spec, {
  name: 'List Notifications',
  key: 'list_notifications',
  description:
    'List GitHub notifications for the authenticated user, including mentions, review requests, assignments, and updates on issues or pull requests. Use this to discover pending work or summarize what needs attention.',
  tags: { readOnly: true }
})
  .scopes(anyOf('notifications'))
  .input(
    z.object({
      filter: notificationFilterSchema
        .optional()
        .describe(
          'Filter notifications. Use default unless requested otherwise; include_read_notifications also returns acknowledged notifications, while only_participating limits results to threads the user directly participates in.'
        ),
      since: z
        .string()
        .optional()
        .describe('Only show notifications updated after this RFC3339 timestamp'),
      before: z
        .string()
        .optional()
        .describe('Only show notifications updated before this RFC3339 timestamp'),
      owner: z
        .string()
        .optional()
        .describe('Repository owner; provide together with repo to limit results'),
      repo: z
        .string()
        .optional()
        .describe('Repository name; provide together with owner to limit results'),
      page: z.number().min(1).optional().describe('Page number for pagination (minimum 1)'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page for pagination (minimum 1, maximum 100)')
    })
  )
  .output(
    z.object({
      notifications: z.array(notificationSchema),
      filter: notificationFilterSchema,
      owner: z.string().nullable(),
      repo: z.string().nullable(),
      page: z.number(),
      perPage: z.number(),
      returnedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const repository = requireRepositoryPair(ctx.input.owner, ctx.input.repo);
    const filter = ctx.input.filter ?? 'default';
    const client = new GitHubNotificationsClient(ctx.auth);
    const values = await client.listNotifications({
      ...ctx.input,
      filter,
      since: requireRfc3339(ctx.input.since, 'since'),
      before: requireRfc3339(ctx.input.before, 'before'),
      owner: repository?.owner,
      repo: repository?.repo
    });
    const notifications = values.map(mapGitHubNotification);
    const scope = repository ? ` in **${repository.owner}/${repository.repo}**` : '';

    return {
      output: {
        notifications,
        filter,
        owner: repository?.owner ?? null,
        repo: repository?.repo ?? null,
        page: ctx.input.page ?? 1,
        perPage: ctx.input.perPage ?? 30,
        returnedCount: notifications.length
      },
      message: `Found **${notifications.length}** GitHub notifications${scope}.`
    };
  })
  .build();
