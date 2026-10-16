import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getItemGroup = SlateTool.create(spec, {
  key: 'get_item_group',
  name: 'Get Item Group',
  description: 'Retrieve an item group by ID. Call list_item_groups to discover group IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ groupId: z.string().describe('Group ID from list_item_groups') }))
  .output(z.object({ id: z.string(), groupId: z.string(), name: z.string() }).passthrough())
  .handleInvocation(async ctx => {
    let group = await new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    }).getGroup(ctx.input.groupId);
    return {
      output: { ...group, groupId: group.id },
      message: `Retrieved item group ${group.name}.`
    };
  })
  .build();
