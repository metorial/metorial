import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUpdateTool = SlateTool.create(spec, {
  name: 'Delete Update',
  key: 'delete_update',
  description: `Permanently delete an existing status update from the queue.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      updateId: z.string().describe('ID of the update to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteUpdate(ctx.input.updateId);

    return {
      output: {
        success: result.success
      },
      message: `Successfully deleted update **${ctx.input.updateId}**.`
    };
  })
  .build();
