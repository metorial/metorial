import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let listPullRequests = SlateTool.create(spec, {
  name: 'List Pull Requests',
  key: 'list_pull_requests',
  description: `List pull requests in a GitHub repository with filtering by state, head/base branch, and sorting options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      state: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter by state (default: open)'),
      head: z.string().optional().describe('Filter by head branch (format: "user:branch")'),
      base: z.string().optional().describe('Filter by base branch name'),
      sort: z
        .enum(['created', 'updated', 'popularity', 'long-running'])
        .optional()
        .describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      pullRequests: z.array(
        z.object({
          pullNumber: z.number().describe('Pull request number'),
          title: z.string().describe('PR title'),
          state: z.string().describe('PR state'),
          author: z.string().describe('PR author login'),
          head: z.string().describe('Head branch ref'),
          base: z.string().describe('Base branch ref'),
          draft: z.boolean().describe('Whether the PR is a draft'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp'),
          htmlUrl: z.string().describe('URL to the PR on GitHub')
        })
      ),
      totalCount: z.number().describe('Number of pull requests returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let prs = await client.listPullRequests(ctx.input.owner, ctx.input.repo, {
      state: ctx.input.state,
      head: ctx.input.head,
      base: ctx.input.base,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let pullRequests = prs.map((pr: any) => ({
      pullNumber: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user.login,
      head: pr.head.ref,
      base: pr.base.ref,
      draft: pr.draft,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      htmlUrl: pr.html_url
    }));

    return {
      output: { pullRequests, totalCount: pullRequests.length },
      message: `Found **${pullRequests.length}** pull requests in **${ctx.input.owner}/${ctx.input.repo}** (state: ${ctx.input.state ?? 'open'}).`
    };
  })
  .build();
