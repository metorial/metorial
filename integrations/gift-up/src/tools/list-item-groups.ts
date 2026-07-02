import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listItemGroups = SlateTool.create(spec, {
  name: 'List Item Groups',
  key: 'list_item_groups',
  description: `List all item groups configured in the account. Item groups organize items in the checkout.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(
        z
          .object({
            groupId: z.string().describe('Group ID'),
            name: z.string().describe('Group name'),
            description: z.string().nullable().describe('Description'),
            sortOrder: z.number().nullable().describe('Sort order'),
            autoExpand: z.boolean().nullable().describe('Auto-expand in checkout')
          })
          .passthrough()
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let groups = await client.listGroups();

    let mapped = (Array.isArray(groups) ? groups : []).map((g: any) => ({
      ...g,
      groupId: g.id
    }));

    return {
      output: { groups: mapped },
      message: `Found **${mapped.length}** item groups`
    };
  })
  .build();
