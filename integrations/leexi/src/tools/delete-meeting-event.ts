import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMeetingEvent = SlateTool.create(spec, {
  name: 'Delete Meeting Event',
  key: 'delete_meeting_event',
  description: `Delete a meeting event from Leexi by UUID. This removes the scheduled meeting event and prevents the Leexi bot from joining.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      meetingEventUuid: z.string().describe('UUID of the meeting event to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteMeetingEvent(ctx.input.meetingEventUuid);

    return {
      output: {
        success: true
      },
      message: `Meeting event **${ctx.input.meetingEventUuid}** has been deleted.`
    };
  })
  .build();
