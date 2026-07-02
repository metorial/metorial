import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteExhibitor = SlateTool.create(spec, {
  name: 'Delete Exhibitor',
  key: 'delete_exhibitor',
  description: `Permanently delete an exhibitor by their ID. This removes the exhibitor and all their booth assignments from the event.`,
  constraints: [
    'This action is irreversible. The exhibitor and all associated booth assignments will be permanently removed.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      exhibitorId: z.number().describe('ID of the exhibitor to delete')
    })
  )
  .output(
    z.object({
      exhibitorId: z.number().describe('ID of the deleted exhibitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteExhibitor(ctx.input.exhibitorId);

    return {
      output: {
        exhibitorId: ctx.input.exhibitorId
      },
      message: `Deleted exhibitor **${ctx.input.exhibitorId}**.`
    };
  })
  .build();
