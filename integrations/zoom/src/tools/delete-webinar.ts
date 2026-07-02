import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let deleteWebinar = SlateTool.create(spec, {
  name: 'Delete Webinar',
  key: 'delete_webinar',
  description: 'Delete a scheduled Zoom webinar.',
  constraints: ['Requires a paid Zoom Webinar add-on'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      webinarId: z.union([z.string(), z.number()]).describe('The webinar ID to delete'),
      occurrenceId: z.string().optional().describe('Specific webinar occurrence ID'),
      cancelWebinarReminder: z
        .boolean()
        .optional()
        .describe('Send a cancellation email notification to registrants and panelists')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    await client.deleteWebinar(ctx.input.webinarId, {
      occurrenceId: ctx.input.occurrenceId,
      cancelWebinarReminder: ctx.input.cancelWebinarReminder
    });

    return {
      output: { success: true },
      message: `Webinar **${ctx.input.webinarId}** has been deleted.`
    };
  })
  .build();
