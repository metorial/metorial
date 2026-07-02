import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      status: z.array(z.string()).optional().describe('Filter by issue status values'),
      priority: z.array(z.string()).optional().describe('Filter by priority levels'),
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

    let issues = result.issues.map((i: any) => ({
      issueId: i.id || i.incident_id,
      title: i.title,
      description: i.description,
      status: i.status,
      priority: i.priority,
      categoryId: i.category_id || i.category?.id,
      siteId: i.site_id || i.site?.id,
      dueAt: i.due_at,
      occurredAt: i.occurred_at,
      createdAt: i.created_at
    }));

    return {
      output: { issues, nextPageToken: result.nextPageToken },
      message: `Found **${issues.length}** issues.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
