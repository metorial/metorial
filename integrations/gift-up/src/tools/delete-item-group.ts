import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteItemGroup = SlateTool.create(spec, {
  name: 'Delete Item Group',
  key: 'delete_item_group',
  description: `Permanently delete an item group. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the item group to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the group was deleted'),
      groupId: z.string().describe('ID of the deleted group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    await client.deleteGroup(ctx.input.groupId);

    return {
      output: { deleted: true, groupId: ctx.input.groupId },
      message: `Deleted item group **${ctx.input.groupId}**`
    };
  })
  .build();
