import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteEpic = SlateTool.create(spec, {
  name: 'Delete Epic',
  key: 'delete_epic',
  description: `Permanently deletes an epic by its ID. Stories within the epic are not deleted, but will no longer be associated with the epic. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      epicId: z.number().describe('ID of the epic to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the epic was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteEpic(ctx.input.epicId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted epic with ID ${ctx.input.epicId}`
    };
  })
  .build();
