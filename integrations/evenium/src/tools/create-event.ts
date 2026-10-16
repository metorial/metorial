import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { eventSchema } from '../lib/schemas';
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
      description: z.string().optional().describe('Event description'),
      location: z
        .object({
          name: z.string().optional(),
          street: z.string().optional(),
          city: z.string().optional(),
          countryCode: z.string().optional().describe('Two-letter country code')
        })
        .optional()
        .describe('Event venue'),
      moduleConfigs: z
        .array(
          z.enum(['EVENT_CONNEXME', 'EVENT_GUEST_EXPENSES', 'EVENT_ONSITE', 'EVENT_HIERARCHY'])
        )
        .optional()
        .describe('Optional event modules; availability depends on the account')
    })
  )
  .output(eventSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let event = await client.createEvent({
      title: ctx.input.title,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      description: ctx.input.description,
      location: ctx.input.location,
      moduleConfigs: ctx.input.moduleConfigs
    });

    return {
      output: {
        eventId: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        description: event.description,
        status: event.status,
        raw: event.raw
      },
      message: `Created event **${event.title}** with ID \`${event.id}\`.`
    };
  })
  .build();
