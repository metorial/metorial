import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let updateEvent = SlateTool.create(spec, {
  name: 'Update Event',
  key: 'update_event',
  description: `Update the details of an existing event in WaiverFile. You can change the event name, dates, category, and associated waiver forms.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event to update'),
      eventName: z.string().describe('Updated name of the event'),
      dateStart: z.string().describe('Updated start date/time (UTC, ISO 8601)'),
      dateEnd: z.string().describe('Updated end date/time (UTC, ISO 8601)'),
      isAllDay: z.boolean().describe('Whether this is an all-day event'),
      eventCategoryId: z
        .string()
        .describe(
          'Category ID from manage_event_categories. Use 00000000-0000-0000-0000-000000000000 for no category.'
        ),
      waiverFormIds: z
        .array(z.string())
        .optional()
        .describe(
          'Waiver form IDs from get_waiver_forms. Omit or pass an empty array to attach all active forms.'
        )
    })
  )
  .output(
    z.object({
      result: z.any().describe('Update operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient({
      token: ctx.auth.token,
      siteId: ctx.auth.siteId
    });

    let result = await client.updateEvent({
      eventId: ctx.input.eventId,
      eventName: ctx.input.eventName,
      dateStart: ctx.input.dateStart,
      dateEnd: ctx.input.dateEnd,
      isAllDay: ctx.input.isAllDay,
      eventCategoryId: ctx.input.eventCategoryId,
      waiverFormIds: ctx.input.waiverFormIds
    });

    return {
      output: { result },
      message: 'Received the event update response.'
    };
  })
  .build();
