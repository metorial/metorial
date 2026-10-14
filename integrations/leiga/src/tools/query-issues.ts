import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
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
      projectId: projectIdSchema,
      pageNumber: z.number().optional().default(1).describe('Page number (starts at 1)'),
      pageSize: z.number().optional().default(20).describe('Number of issues per page'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Documented query fields: summary, selectFields (field codes mapped to option ID arrays), dateFields (field codes mapped to timestamp ranges), statusTypes (2 not started, 3 in progress, 4 done), orderBy (createTime or updateTime), sort (ASC or DESC), and showedCustomFieldCodes. These fields are sent in the query body.'
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
