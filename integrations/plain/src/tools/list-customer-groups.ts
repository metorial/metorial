import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomerGroups = SlateTool.create(spec, {
  name: 'List Customer Groups',
  key: 'list_customer_groups',
  description: `List all customer groups in the workspace. Customer groups are used for organizing customers by segment, pricing tier, or other criteria.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().default(50).describe('Number of groups to return'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string().describe('Customer group ID'),
          name: z.string().describe('Group name'),
          key: z.string().describe('Group key'),
          color: z.string().nullable().describe('Group color')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more pages exist'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let res = await client.getCustomerGroups(ctx.input.first, ctx.input.after);

    let groups = (res.edges || []).map((edge: any) => ({
      groupId: edge.node.id,
      name: edge.node.name,
      key: edge.node.key,
      color: edge.node.color
    }));

    return {
      output: {
        groups,
        hasNextPage: res.pageInfo?.hasNextPage ?? false,
        endCursor: res.pageInfo?.endCursor ?? null
      },
      message: `Found **${groups.length}** customer groups`
    };
  })
  .build();
