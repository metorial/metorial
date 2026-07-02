import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let deleteMeeting = SlateTool.create(spec, {
  name: 'Delete Meeting',
  key: 'delete_meeting',
  description: `Delete a scheduled Zoom meeting. This permanently removes the meeting and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      meetingId: z.union([z.string(), z.number()]).describe('The meeting ID to delete'),
      cancelMeetingReminder: z
        .boolean()
        .optional()
        .describe('Send a cancellation email notification to registrants')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    await client.deleteMeeting(ctx.input.meetingId, {
      cancelMeetingReminder: ctx.input.cancelMeetingReminder
    });

    return {
      output: { success: true },
      message: `Meeting **${ctx.input.meetingId}** has been deleted.`
    };
  })
  .build();
