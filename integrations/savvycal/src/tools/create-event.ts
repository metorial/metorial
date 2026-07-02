import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEventTool = SlateTool.create(spec, {
  name: 'Create Event',
  key: 'create_event',
  description: `Schedule a new event through a SavvyCal scheduling link. The time slot must match the link's available slots. Provide attendee details and optionally custom field values and metadata.`,
  instructions: [
    'The startAt and endAt times must correspond to an available slot on the scheduling link.',
    'Use the List Scheduling Links tool to find the link ID.'
  ],
  constraints: ['Only available time slots on the link can be booked.']
})
  .input(
    z.object({
      linkId: z.string().describe('ID of the scheduling link to create the event for'),
      displayName: z.string().describe('Full name of the attendee'),
      email: z.string().describe('Email address of the attendee'),
      startAt: z.string().describe('Event start time (ISO 8601 format)'),
      endAt: z.string().describe('Event end time (ISO 8601 format)'),
      timeZone: z.string().describe('IANA time zone identifier (e.g., "America/New_York")'),
      phoneNumber: z.string().optional().describe('Phone number of the attendee'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs'),
      fields: z
        .array(
          z.object({
            fieldId: z.string().describe('Custom field ID'),
            value: z.string().describe('Value for the custom field')
          })
        )
        .optional()
        .describe('Custom field responses')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the created event'),
      summary: z.string().describe('Event title'),
      startAt: z.string().describe('Start time'),
      endAt: z.string().describe('End time'),
      state: z.string().describe('Event state'),
      url: z.string().describe('Public event URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let e = await client.createEvent(ctx.input.linkId, {
      displayName: ctx.input.displayName,
      email: ctx.input.email,
      startAt: ctx.input.startAt,
      endAt: ctx.input.endAt,
      timeZone: ctx.input.timeZone,
      phoneNumber: ctx.input.phoneNumber,
      metadata: ctx.input.metadata,
      fields: ctx.input.fields
    });

    return {
      output: {
        eventId: e.id,
        summary: e.summary,
        startAt: e.start_at,
        endAt: e.end_at,
        state: e.state,
        url: e.url
      },
      message: `Created event **"${e.summary}"** for ${ctx.input.displayName} starting at ${e.start_at}.`
    };
  })
  .build();
