import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { spec } from '../spec';

export let listIssues = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `List GitLab issues filtered by project, state, labels, milestone, assignee, author, or search term. Can list issues globally or within a specific project. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe(
          'Project ID or path to scope issues to a specific project. Omit for global issue list.'
        ),
      state: z.enum(['opened', 'closed', 'all']).optional().describe('Filter by issue state'),
      labels: z.string().optional().describe('Comma-separated label names to filter by'),
      milestone: z.string().optional().describe('Milestone title to filter by'),
      assigneeId: z.number().optional().describe('User ID of assignee to filter by'),
      authorId: z.number().optional().describe('User ID of author to filter by'),
      search: z.string().optional().describe('Search term to filter issues'),
      scope: z
        .enum(['created_by_me', 'assigned_to_me', 'all'])
        .optional()
        .describe('Scope of issues to return'),
      orderBy: z
        .enum(['created_at', 'updated_at', 'priority', 'due_date', 'label_priority', 'weight'])
        .optional()
        .describe('Order by field'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Number of results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      issues: z.array(
        z.object({
          issueId: z.number().describe('Global issue ID'),
          issueIid: z.number().describe('Issue IID within the project'),
          title: z.string().describe('Issue title'),
          state: z.string().describe('Issue state'),
          webUrl: z.string().describe('URL to the issue'),
          labels: z.array(z.string()).describe('Applied labels'),
          authorUsername: z.string().nullable().describe('Author username'),
          assignees: z.array(z.string()).describe('Assignee usernames'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp'),
          dueDate: z.string().nullable().describe('Due date')
        })
      ),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let result = await client.listIssues({
      projectId: ctx.input.projectId,
      state: ctx.input.state,
      labels: ctx.input.labels,
      milestone: ctx.input.milestone,
      assigneeId: ctx.input.assigneeId,
      authorId: ctx.input.authorId,
      search: ctx.input.search,
      scope: ctx.input.scope,
      orderBy: ctx.input.orderBy,
      sort: ctx.input.sort,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let issues = result.issues.map((i: any) => ({
      issueId: i.id,
      issueIid: i.iid,
      title: i.title,
      state: i.state,
      webUrl: i.web_url,
      labels: i.labels || [],
      authorUsername: i.author?.username || null,
      assignees: (i.assignees || []).map((a: any) => a.username),
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      dueDate: i.due_date || null
    }));

    return {
      output: { issues, totalPages: result.totalPages },
      message: `Found **${issues.length}** issues${ctx.input.state ? ` (${ctx.input.state})` : ''}`
    };
  })
  .build();
