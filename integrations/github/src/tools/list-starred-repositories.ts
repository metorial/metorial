import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubRepositorySyncApi } from '../lib/github-repositories-new';
import { spec } from '../spec';

export let listStarredRepositories = SlateTool.create(spec, {
  name: 'List Starred Repositories',
  key: 'list_starred_repositories',
  description:
    'List repositories starred by a GitHub user. Omit username to list repositories starred by the authenticated user.',
  tags: { readOnly: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe(
          'Username to list starred repositories for. Defaults to the authenticated user.'
        ),
      sort: z
        .enum(['created', 'updated'])
        .optional()
        .describe(
          "How to sort the results. Can be either 'created' (when the repository was starred) or 'updated' (when the repository was last pushed to)."
        ),
      direction: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('The direction to sort the results by.'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page for pagination (min 1, max 100)'),
      page: z.number().min(1).optional().describe('Page number for pagination (min 1)')
    })
  )
  .output(
    z.object({
      username: z
        .string()
        .nullable()
        .describe('Requested username, or null for the current user'),
      repositories: z
        .array(z.record(z.string(), z.any()))
        .describe('Repositories starred by the requested user'),
      returnedCount: z.number().describe('Number of repositories returned')
    })
  )
  .handleInvocation(async ctx => {
    let repositories = await new GitHubRepositorySyncApi(ctx.auth).listStarredRepositories(
      ctx.input
    );
    return {
      output: {
        username: ctx.input.username ?? null,
        repositories,
        returnedCount: repositories.length
      },
      message: ctx.input.username
        ? `Retrieved **${repositories.length}** repositories starred by **${ctx.input.username}**.`
        : `Retrieved **${repositories.length}** repositories starred by the authenticated user.`
    };
  })
  .build();
