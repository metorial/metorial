import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export let searchRepos = SlateTool.create(spec, {
  name: 'Search Repositories',
  key: 'search_repos',
  description: `Search and list repositories on the Gitea instance. Can search by keyword, list the authenticated user's repositories, or list repositories belonging to a specific organization. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter repositories by name or description'),
      owner: z
        .string()
        .optional()
        .describe('Filter repositories by owner username or organization name'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Number of results per page (max 50)'),
      sort: z
        .enum(['alpha', 'created', 'updated', 'size', 'id'])
        .optional()
        .describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      repositories: z.array(
        z.object({
          repositoryId: z.number().describe('Repository ID'),
          name: z.string().describe('Repository name'),
          fullName: z.string().describe('Full repository name (owner/name)'),
          description: z.string().describe('Repository description'),
          htmlUrl: z.string().describe('Web URL of the repository'),
          cloneUrl: z.string().describe('HTTPS clone URL'),
          isPrivate: z.boolean().describe('Whether the repository is private'),
          isFork: z.boolean().describe('Whether the repository is a fork'),
          isArchived: z.boolean().describe('Whether the repository is archived'),
          defaultBranch: z.string().describe('Default branch name'),
          starsCount: z.number().describe('Number of stars'),
          forksCount: z.number().describe('Number of forks'),
          openIssuesCount: z.number().describe('Number of open issues'),
          language: z.string().describe('Primary language'),
          ownerLogin: z.string().describe('Owner username'),
          topics: z.array(z.string()).describe('Repository topics'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });

    let repos: any;
    if (ctx.input.owner) {
      repos = await client.searchRepos({
        q: ctx.input.query,
        page: ctx.input.page,
        limit: ctx.input.limit,
        sort: ctx.input.sort,
        order: ctx.input.order
      });
      repos = repos.filter(
        (r: any) => r.owner.login.toLowerCase() === ctx.input.owner!.toLowerCase()
      );
    } else if (ctx.input.query) {
      repos = await client.searchRepos({
        q: ctx.input.query,
        page: ctx.input.page,
        limit: ctx.input.limit,
        sort: ctx.input.sort,
        order: ctx.input.order
      });
    } else {
      repos = await client.listMyRepos({
        page: ctx.input.page,
        limit: ctx.input.limit,
        sort: ctx.input.sort,
        order: ctx.input.order
      });
    }

    let repositories = repos.map((r: any) => ({
      repositoryId: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      isPrivate: r.private,
      isFork: r.fork,
      isArchived: r.archived,
      defaultBranch: r.default_branch,
      starsCount: r.stars_count,
      forksCount: r.forks_count,
      openIssuesCount: r.open_issues_count,
      language: r.language || '',
      ownerLogin: r.owner.login,
      topics: r.topics || [],
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: { repositories },
      message: `Found **${repositories.length}** repositories${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}`
    };
  })
  .build();
