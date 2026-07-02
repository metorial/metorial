import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let listIssues = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `List issues in a GitHub repository with filtering and sorting options.
Filter by state, labels, assignee, milestone, and since date. Note: GitHub's API returns pull requests alongside issues — this tool filters them out.`,
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
      labels: z.string().optional().describe('Comma-separated label names to filter by'),
      assignee: z
        .string()
        .optional()
        .describe('Filter by assignee username, or "none" for unassigned'),
      sort: z.enum(['created', 'updated', 'comments']).optional().describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      since: z
        .string()
        .optional()
        .describe('Only issues updated after this ISO 8601 timestamp'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      issues: z.array(
        z.object({
          issueNumber: z.number().describe('Issue number'),
          title: z.string().describe('Issue title'),
          state: z.string().describe('Issue state'),
          author: z.string().describe('Issue author login'),
          assignees: z.array(z.string()).describe('Assigned usernames'),
          labels: z.array(z.string()).describe('Label names'),
          commentsCount: z.number().describe('Number of comments'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp'),
          htmlUrl: z.string().describe('URL to the issue on GitHub')
        })
      ),
      totalCount: z.number().describe('Number of issues returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let items = await client.listIssues(ctx.input.owner, ctx.input.repo, {
      state: ctx.input.state,
      labels: ctx.input.labels,
      assignee: ctx.input.assignee,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      since: ctx.input.since,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let issues = items
      .filter((i: any) => !i.pull_request)
      .map((i: any) => ({
        issueNumber: i.number,
        title: i.title,
        state: i.state,
        author: i.user.login,
        assignees: (i.assignees ?? []).map((a: any) => a.login),
        labels: (i.labels ?? []).map((l: any) => l.name),
        commentsCount: i.comments,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        htmlUrl: i.html_url
      }));

    return {
      output: { issues, totalCount: issues.length },
      message: `Found **${issues.length}** issues in **${ctx.input.owner}/${ctx.input.repo}** (state: ${ctx.input.state ?? 'open'}).`
    };
  })
  .build();
