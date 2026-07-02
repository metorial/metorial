import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Create a new event on a church calendar. Specify the event name, start/end datetime, and optionally assign it to a calendar category.`
})
  .input(
    z.object({
      name: z.string().describe('Name of the event'),
      startsOn: z
        .string()
        .describe('Start date/time of the event (YYYY-MM-DD HH:MM:SS or YYYY-MM-DD format)'),
      endsOn: z.string().optional().describe('End date/time of the event'),
      allDay: z.boolean().optional().describe('Whether this is an all-day event'),
      description: z.string().optional().describe('Description of the event'),
      categoryId: z.string().optional().describe('Calendar/category ID to place the event on'),
      eventId: z
        .string()
        .optional()
        .describe('Existing event series ID to add this instance to')
    })
  )
  .output(
    z.object({
      event: z.any().describe('The newly created event object')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let event = await client.addEvent({
      name: ctx.input.name,
      startsOn: ctx.input.startsOn,
      endsOn: ctx.input.endsOn,
      allDay: ctx.input.allDay,
      description: ctx.input.description,
      categoryId: ctx.input.categoryId,
      eventId: ctx.input.eventId
    });

    return {
      output: { event },
      message: `Created event **${ctx.input.name}** starting on ${ctx.input.startsOn}.`
    };
  })
  .build();
