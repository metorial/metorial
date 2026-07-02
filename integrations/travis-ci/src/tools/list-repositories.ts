import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let listRepositories = SlateTool.create(spec, {
  name: 'List Repositories',
  key: 'list_repositories',
  description: `List repositories accessible to the authenticated user or a specific owner. Supports filtering by active status, starred status, and privacy. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ownerLogin: z
        .string()
        .optional()
        .describe(
          'Filter repositories by owner login name. If omitted, returns repositories for the authenticated user.'
        ),
      active: z
        .boolean()
        .optional()
        .describe('Filter by whether the repository is active on Travis CI.'),
      starred: z.boolean().optional().describe('Filter by whether the repository is starred.'),
      limit: z.number().optional().describe('Maximum number of repositories to return.'),
      offset: z.number().optional().describe('Number of repositories to skip for pagination.'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort field. Options: id, github_id, owner_name, name, active, default_branch.last_build. Append :desc for reverse order.'
        )
    })
  )
  .output(
    z.object({
      repositories: z.array(
        z.object({
          repositoryId: z.number().describe('Unique repository ID'),
          name: z.string().describe('Repository name'),
          slug: z.string().describe('Repository slug (owner/name)'),
          description: z.string().nullable().describe('Repository description'),
          active: z.boolean().describe('Whether the repository is active on Travis CI'),
          isPrivate: z.boolean().describe('Whether the repository is private'),
          starred: z.boolean().optional().describe('Whether the repository is starred'),
          defaultBranch: z.string().optional().describe('Default branch name')
        })
      ),
      totalCount: z.number().optional().describe('Total number of matching repositories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listRepositories({
      ownerLogin: ctx.input.ownerLogin,
      active: ctx.input.active,
      starred: ctx.input.starred,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy
    });

    let repositories = (result.repositories || []).map((repo: any) => ({
      repositoryId: repo.id,
      name: repo.name,
      slug: repo.slug,
      description: repo.description ?? null,
      active: repo.active,
      isPrivate: repo.private,
      starred: repo.starred,
      defaultBranch: repo.default_branch?.name
    }));

    return {
      output: {
        repositories,
        totalCount: result['@pagination']?.count
      },
      message: `Found **${repositories.length}** repositories${ctx.input.ownerLogin ? ` for owner **${ctx.input.ownerLogin}**` : ''}.`
    };
  })
  .build();
