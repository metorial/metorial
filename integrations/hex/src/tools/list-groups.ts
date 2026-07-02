import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all groups in the Hex workspace. Returns group names, IDs, and creation dates with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of results per page (1-500)'),
      after: z.string().optional().describe('Pagination cursor for the next page'),
      sortBy: z.enum(['CREATED_AT', 'NAME']).optional().describe('Field to sort by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string(),
          name: z.string(),
          createdAt: z.string()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listGroups({
      limit: ctx.input.limit,
      after: ctx.input.after,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let groups = result.values ?? [];

    return {
      output: {
        groups,
        nextCursor: result.pagination?.after
      },
      message: `Found **${groups.length}** group(s).${result.pagination?.after ? ' More results available.' : ''}`
    };
  })
  .build();
