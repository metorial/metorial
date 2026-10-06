import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteList = SlateTool.create(spec, {
  name: 'Delete List',
  key: 'delete_list',
  description: `Permanently delete a contact list and all its contacts, custom fields, and tags. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      listId: listIdSchema
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the list was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteList(ctx.input.listId);

    return {
      output: { deleted: true },
      message: `Deleted list \`${client.safeText(ctx.input.listId)}\`.`
    };
  })
  .build();
