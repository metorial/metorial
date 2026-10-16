import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteList = SlateTool.create(spec, {
  name: 'Delete List',
  key: 'delete_list',
  description: 'Delete a conversion list by ID. Call get_lists to find the list to delete.',
  tags: { destructive: true }
})
  .input(z.object({ listId: z.string().min(1).describe('List ID from get_lists') }))
  .output(z.object({ success: z.boolean().describe('Whether the delete request succeeded') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteList(ctx.input.listId);
    return { output: { success: true }, message: `Deleted list \`${ctx.input.listId}\`.` };
  })
  .build();
