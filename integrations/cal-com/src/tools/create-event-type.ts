import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createEventType = SlateTool.create(spec, {
  name: 'Create Event Type',
  key: 'create_event_type',
  description: `Create a new event type that defines what can be booked. Configure the title, duration, location, scheduling rules, and custom booking fields.`,
  instructions: [
    'The title and lengthInMinutes are required.',
    'If no location is provided, Cal Video is used by default.',
    'Use scheduleId to assign a specific availability schedule instead of the default.'
  ]
})
  .input(
    z.object({
      title: z.string().describe('Title of the event type (e.g., "30 min meeting")'),
      slug: z.string().optional().describe('URL-friendly slug for the event type'),
      lengthInMinutes: z.number().describe('Duration of the event in minutes'),
      description: z.string().optional().describe('Description shown to bookers'),
      locations: z
        .array(z.any())
        .optional()
        .describe('Array of location objects defining where the event takes place'),
      scheduleId: z.number().optional().describe('ID of the availability schedule to use'),
      slotInterval: z
        .number()
        .optional()
        .describe('Interval between available slots in minutes'),
      bookingFields: z.array(z.any()).optional().describe('Custom booking form fields'),
      disableGuests: z.boolean().optional().describe('Whether to disable adding guests'),
      minimumBookingNotice: z
        .number()
        .optional()
        .describe('Minimum notice in minutes before a booking can be made'),
      beforeEventBuffer: z
        .number()
        .optional()
        .describe('Buffer time in minutes before the event'),
      afterEventBuffer: z
        .number()
        .optional()
        .describe('Buffer time in minutes after the event'),
      requiresBookerAuthentication: z
        .boolean()
        .optional()
        .describe('Require authentication to book'),
      hideCalendarNotes: z.boolean().optional().describe('Hide calendar notes from attendees'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata for the event type')
    })
  )
  .output(
    z.object({
      eventType: z.any().describe('Created event type details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let body: Record<string, any> = {
      title: ctx.input.title,
      lengthInMinutes: ctx.input.lengthInMinutes
    };

    if (ctx.input.slug) body.slug = ctx.input.slug;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.locations) body.locations = ctx.input.locations;
    if (ctx.input.scheduleId) body.scheduleId = ctx.input.scheduleId;
    if (ctx.input.slotInterval) body.slotInterval = ctx.input.slotInterval;
    if (ctx.input.bookingFields) body.bookingFields = ctx.input.bookingFields;
    if (ctx.input.disableGuests !== undefined) body.disableGuests = ctx.input.disableGuests;
    if (ctx.input.minimumBookingNotice)
      body.minimumBookingNotice = ctx.input.minimumBookingNotice;
    if (ctx.input.beforeEventBuffer) body.beforeEventBuffer = ctx.input.beforeEventBuffer;
    if (ctx.input.afterEventBuffer) body.afterEventBuffer = ctx.input.afterEventBuffer;
    if (ctx.input.requiresBookerAuthentication !== undefined)
      body.requiresBookerAuthentication = ctx.input.requiresBookerAuthentication;
    if (ctx.input.hideCalendarNotes !== undefined)
      body.hideCalendarNotes = ctx.input.hideCalendarNotes;
    if (ctx.input.metadata) body.metadata = ctx.input.metadata;

    let eventType = await client.createEventType(body);

    return {
      output: { eventType },
      message: `Event type **${ctx.input.title}** (${ctx.input.lengthInMinutes} min) created.`
    };
  })
  .build();
