import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List one native page of groups in OneLogin. Groups function as security boundaries to apply specific security policies to sets of users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      afterCursor: z.string().optional().describe('Native cursor from the previous page'),
      limit: z.number().optional().describe('Page size, maximum 50')
    })
  )
  .output(
    z.object({
      afterCursor: z.string().nullable().describe('Native next cursor, or null'),
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('Group ID'),
            name: z.string().describe('Group name'),
            reference: z.string().nullable().optional().describe('Group reference identifier')
          })
        )
        .describe('List of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = OneLoginClient.fromContext(ctx);

    let data = await client.listGroups({
      after_cursor: ctx.input.afterCursor,
      limit: ctx.input.limit
    });
    let groups = data.data;

    let mapped = groups.map(g => ({
      groupId: g.id,
      name: g.name,
      reference: g.reference
    }));

    return {
      output: { groups: mapped, afterCursor: data.pagination.after_cursor ?? null },
      message: `Found **${mapped.length}** group(s).`
    };
  });
