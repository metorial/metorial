import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEmailList = SlateTool.create(spec, {
  name: 'Delete Email List',
  key: 'delete_email_list',
  description: `Permanently delete an email list and all its verification results. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the email list to delete')
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
      message: `Email list \`${ctx.input.listId}\` has been permanently deleted.`
    };
  })
  .build();
