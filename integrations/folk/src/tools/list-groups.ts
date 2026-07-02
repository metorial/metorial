import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Lists all groups in your Folk workspace. Groups organize contacts into categories for different workflows. Use group IDs to manage group memberships, custom fields, and deals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string(),
            groupName: z.string()
          })
        )
        .describe('List of groups'),
      nextCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listGroups({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let nextCursor: string | null = null;
    if (result.pagination.nextLink) {
      let url = new URL(result.pagination.nextLink);
      nextCursor = url.searchParams.get('cursor');
    }

    return {
      output: {
        groups: result.items.map(g => ({
          groupId: g.id,
          groupName: g.name
        })),
        nextCursor
      },
      message: `Found **${result.items.length}** groups${nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
