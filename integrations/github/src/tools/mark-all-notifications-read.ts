import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  GitHubNotificationsClient,
  requireRepositoryPair,
  requireRfc3339
} from '../lib/github-notifications';
import { spec } from '../spec';

export const markAllNotificationsRead = SlateTool.create(spec, {
  name: 'Mark All Notifications as Read',
  key: 'mark_all_notifications_read',
  description:
    'Mark GitHub notifications as read through a specified time. Optionally limit the operation to one repository by providing owner and repo together.',
  tags: { destructive: true }
})
  .scopes(anyOf('notifications'))
  .input(
    z.object({
      lastReadAt: z
        .string()
        .optional()
        .describe(
          'Last point notifications were checked as an RFC3339 timestamp; defaults to now'
        ),
      owner: z
        .string()
        .optional()
        .describe('Repository owner; provide together with repo to limit the operation'),
      repo: z
        .string()
        .optional()
        .describe('Repository name; provide together with owner to limit the operation')
    })
  )
  .output(
    z.object({
      scope: z.enum(['all', 'repository']),
      owner: z.string().nullable(),
      repo: z.string().nullable(),
      repositoryHtmlUrl: z.string().nullable(),
      lastReadAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const repository = requireRepositoryPair(ctx.input.owner, ctx.input.repo);
    const lastReadAt =
      requireRfc3339(ctx.input.lastReadAt, 'lastReadAt') ?? new Date().toISOString();
    const client = new GitHubNotificationsClient(ctx.auth);
    await client.markAllNotificationsRead({
      lastReadAt,
      owner: repository?.owner,
      repo: repository?.repo
    });
    const repositoryHtmlUrl = repository
      ? client.getRepositoryHtmlUrl(repository.owner, repository.repo)
      : null;

    return {
      output: {
        scope: repository ? 'repository' : 'all',
        owner: repository?.owner ?? null,
        repo: repository?.repo ?? null,
        repositoryHtmlUrl,
        lastReadAt
      },
      message: repository
        ? `Marked notifications in **${repository.owner}/${repository.repo}** as read.`
        : 'Marked all GitHub notifications as read.'
    };
  })
  .build();
