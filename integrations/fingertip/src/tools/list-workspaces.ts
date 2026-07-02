import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaces = SlateTool.create(spec, {
  name: 'List Workspaces',
  key: 'list_workspaces',
  description: `List workspaces in your Fingertip account. Workspaces serve as organizational containers for sites and team collaboration.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)'),
      sortBy: z.enum(['createdAt', 'updatedAt']).optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      workspaces: z.array(
        z.object({
          workspaceId: z.string(),
          name: z.string(),
          slug: z.string(),
          siteCount: z.number(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listWorkspaces({
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let workspaces = result.items.map(w => ({
      workspaceId: w.id,
      name: w.name,
      slug: w.slug,
      siteCount: w.sites?.length ?? 0,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    }));

    return {
      output: {
        workspaces,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** workspace(s). Returned ${workspaces.length} on this page.`
    };
  })
  .build();
