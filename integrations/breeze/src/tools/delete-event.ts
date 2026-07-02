import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteEvent = SlateTool.create(spec, {
  name: 'Delete Event',
  key: 'delete_event',
  description: `Delete an event instance by its instance ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      instanceId: z.string().describe('Event instance ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.deleteEvent(ctx.input.instanceId);

    return {
      output: { success: result === true || result === 'true' },
      message: `Deleted event instance (ID: ${ctx.input.instanceId}).`
    };
  })
  .build();
