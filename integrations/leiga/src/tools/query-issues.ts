import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryIssuesTool = SlateTool.create(spec, {
  name: 'Query Issues',
  key: 'query_issues',
  description: `Search and filter issues in a Leiga project. Supports pagination and flexible filter criteria for status, type, priority, assignee, sprint, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID to query issues from'),
      pageNumber: z.number().optional().default(1).describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .default(20)
        .describe('Number of issues per page (max 100)'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Filter criteria object. Keys can include status, type, priority, assignee, sprint, epic, label, and other field names.'
        )
    })
  )
  .output(
    z.object({
      issues: z.array(z.any()).describe('List of matching issues'),
      total: z.number().optional().describe('Total number of matching issues')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.queryIssues({
      projectId: ctx.input.projectId,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize,
      filters: ctx.input.filters
    });

    let issues = Array.isArray(response.data)
      ? response.data
      : (response.data as any)?.list || [];
    let total = (response.data as any)?.total;

    return {
      output: { issues, total },
      message: `Found **${issues.length}** issue(s)${total != null ? ` of ${total} total` : ''}.`
    };
  })
  .build();
