import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEvent = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Create a new event in Evenium. Requires a title and start date at minimum. Optionally include an end date and description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Event title'),
      startDate: z
        .string()
        .describe('Event start date in RFC 3339 format (e.g. 2024-06-15T09:00:00Z)'),
      endDate: z.string().optional().describe('Event end date in RFC 3339 format'),
      description: z.string().optional().describe('Event description')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the newly created event'),
      title: z.string().describe('Event title'),
      startDate: z.string().describe('Event start date'),
      endDate: z.string().optional().describe('Event end date'),
      description: z.string().optional().describe('Event description'),
      status: z.string().optional().describe('Event status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let event = await client.createEvent({
      title: ctx.input.title,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      description: ctx.input.description
    });

    return {
      output: {
        eventId: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        description: event.description,
        status: event.status
      },
      message: `Created event **${event.title}** with ID \`${event.id}\`.`
    };
  })
  .build();
