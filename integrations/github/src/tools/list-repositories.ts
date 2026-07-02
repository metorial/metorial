import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let listRepositories = SlateTool.create(spec, {
  name: 'List Repositories',
  key: 'list_repositories',
  description: `List repositories for the authenticated user or a specific organization.
Supports filtering by type, sorting, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      org: z
        .string()
        .optional()
        .describe(
          'Organization name. If omitted, lists repositories for the authenticated user.'
        ),
      type: z
        .enum(['all', 'owner', 'public', 'private', 'member'])
        .optional()
        .describe('Filter by repository type'),
      sort: z
        .enum(['created', 'updated', 'pushed', 'full_name'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      repositories: z.array(
        z.object({
          repositoryId: z.number().describe('Unique repository ID'),
          name: z.string().describe('Repository name'),
          fullName: z.string().describe('Full name in owner/repo format'),
          owner: z.string().describe('Repository owner login'),
          private: z.boolean().describe('Whether the repository is private'),
          description: z.string().nullable().describe('Repository description'),
          htmlUrl: z.string().describe('URL to the repository on GitHub'),
          defaultBranch: z.string().describe('Default branch name'),
          language: z.string().nullable().describe('Primary programming language'),
          stargazersCount: z.number().describe('Number of stars'),
          forksCount: z.number().describe('Number of forks'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      ),
      totalCount: z.number().describe('Number of repositories returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let repos: any[];
    if (ctx.input.org) {
      repos = await client.listOrgRepos(ctx.input.org, {
        type: ctx.input.type,
        sort: ctx.input.sort,
        direction: ctx.input.direction,
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
    } else {
      repos = await client.listRepositories({
        type: ctx.input.type,
        sort: ctx.input.sort,
        direction: ctx.input.direction,
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });
    }

    let repositories = repos.map((r: any) => ({
      repositoryId: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      private: r.private,
      description: r.description,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch,
      language: r.language,
      stargazersCount: r.stargazers_count,
      forksCount: r.forks_count,
      updatedAt: r.updated_at
    }));

    return {
      output: {
        repositories,
        totalCount: repositories.length
      },
      message: `Found **${repositories.length}** repositories${ctx.input.org ? ` in org **${ctx.input.org}**` : ''}.`
    };
  })
  .build();
