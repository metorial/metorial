import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteList = SlateTool.create(spec, {
  name: 'Delete List',
  key: 'delete_list',
  description: `Delete a contact list by ID. The list will be soft-deleted.`,
  constraints: [
    'A list cannot be deleted if it is in use by forms, landing pages, or automations (returns 409 error).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the list was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteList(ctx.input.listId);

    return {
      output: {
        deleted: true
      },
      message: `List (ID: ${ctx.input.listId}) deleted successfully.`
    };
  })
  .build();
