import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteDestinationTool = SlateTool.create(spec, {
  name: 'Delete Destination',
  key: 'delete_destination',
  description: `Permanently delete an Airbyte destination connector. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      destinationId: z.string().describe('The UUID of the destination to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteDestination(ctx.input.destinationId);

    return {
      output: { success: true },
      message: `Deleted destination ${ctx.input.destinationId}.`
    };
  })
  .build();
