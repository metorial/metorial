import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskState } from '../lib/task-values';
import { spec } from '../spec';

export let listIssues = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `Search and list issues (incidents) in your organization. Filter by status, priority, category, or site. Supports pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .array(z.string())
        .optional()
        .describe('Filter by issue status IDs or names: open or resolved'),
      priority: z
        .array(z.string())
        .optional()
        .describe('Filter by priority IDs or names: none, low, medium, high'),
      categoryIds: z.array(z.string()).optional().describe('Filter by issue category IDs'),
      siteIds: z.array(z.string()).optional().describe('Filter by site IDs'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      issues: z
        .array(
          z.object({
            issueId: z.string().describe('Unique issue identifier'),
            title: z.string().optional().describe('Issue title'),
            description: z.string().optional().describe('Issue description'),
            status: z.string().optional().describe('Current status'),
            priority: z.string().optional().describe('Priority level'),
            categoryId: z.string().optional().describe('Category ID'),
            siteId: z.string().optional().describe('Associated site ID'),
            dueAt: z.string().optional().describe('Due date timestamp'),
            occurredAt: z.string().optional().describe('When the incident occurred'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of matching issues'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listIssues({
      status: ctx.input.status,
      priority: ctx.input.priority,
      categoryIds: ctx.input.categoryIds,
      siteIds: ctx.input.siteIds,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let issues = result.issues.map((issue: any) => {
      let i = issue.task ?? issue;
      return {
        issueId: i.task_id || i.id || issue.incident_id,
        title: i.title ?? undefined,
        description: i.description ?? undefined,
        status: taskState(i.status) ?? i.status_id ?? undefined,
        priority: taskState(i.priority) ?? i.priority_id ?? undefined,
        categoryId: issue.category_id ?? issue.category?.id ?? undefined,
        siteId: i.site_id ?? i.site?.site_id ?? i.site?.id ?? undefined,
        dueAt: i.due_at ?? undefined,
        occurredAt: i.occurred_at ?? undefined,
        createdAt: i.created_at ?? undefined
      };
    });

    return {
      output: { issues, nextPageToken: result.nextPageToken },
      message: `Found **${issues.length}** issues.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
