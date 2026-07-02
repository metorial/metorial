import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let deleteEvent = SlateTool.create(spec, {
  name: 'Delete Event',
  key: 'delete_event',
  description: `Permanently delete an event from WaiverFile by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event to delete')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Delete operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let result = await client.deleteEvent(ctx.input.eventId);

    return {
      output: { result },
      message: `Deleted event **${ctx.input.eventId}**.`
    };
  })
  .build();
