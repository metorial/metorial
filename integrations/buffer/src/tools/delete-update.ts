import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUpdateTool = SlateTool.create(spec, {
  name: 'Delete Update',
  key: 'delete_update',
  description: `Delete an existing unpublished update from Buffer. This does not delete a post already published on a social network.`,
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
    let client = new Client(ctx.auth);
    let result = await client.deleteUpdate(ctx.input.updateId);

    return {
      output: {
        success: result.success
      },
      message: `Successfully deleted update **${ctx.input.updateId}**.`
    };
  })
  .build();
