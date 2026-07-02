import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBooking = SlateTool.create(spec, {
  name: 'Create Booking',
  key: 'create_booking',
  description: `Create a new booking on Cal.com. Supports regular, recurring, and instant bookings depending on the event type. Provide the event type ID or slug+username combination, along with the start time and attendee details.`,
  instructions: [
    'The start time must be in ISO 8601 UTC format (e.g., 2025-01-01T09:00:00Z).',
    'If the event type is recurring, a recurring booking series is automatically created.',
    'Use getAvailableSlots first to find valid time slots before creating a booking.'
  ]
})
  .input(
    z.object({
      eventTypeId: z.number().optional().describe('ID of the event type to book'),
      eventTypeSlug: z
        .string()
        .optional()
        .describe('Slug of the event type (requires username)'),
      username: z
        .string()
        .optional()
        .describe('Username of the event type owner (used with eventTypeSlug)'),
      start: z.string().describe('Start time of the booking in ISO 8601 UTC format'),
      attendeeName: z.string().describe('Full name of the attendee'),
      attendeeEmail: z.string().describe('Email address of the attendee'),
      attendeeTimeZone: z
        .string()
        .describe('Time zone of the attendee (e.g., America/New_York)'),
      attendeePhoneNumber: z
        .string()
        .optional()
        .describe('Phone number of the attendee (required if SMS reminders are enabled)'),
      guests: z
        .array(z.string())
        .optional()
        .describe('List of guest email addresses to include'),
      location: z.string().optional().describe('Meeting location or URL'),
      meetingUrl: z.string().optional().describe('Custom meeting URL'),
      notes: z.string().optional().describe('Additional notes or comments for the booking'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata key-value pairs'),
      bookingFieldsResponses: z
        .record(z.string(), z.any())
        .optional()
        .describe('Responses to custom booking form fields')
    })
  )
  .output(
    z.object({
      booking: z.any().describe('Created booking details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let body: Record<string, any> = {
      start: ctx.input.start,
      attendee: {
        name: ctx.input.attendeeName,
        email: ctx.input.attendeeEmail,
        timeZone: ctx.input.attendeeTimeZone,
        phoneNumber: ctx.input.attendeePhoneNumber
      }
    };

    if (ctx.input.eventTypeId) body.eventTypeId = ctx.input.eventTypeId;
    if (ctx.input.eventTypeSlug) body.eventTypeSlug = ctx.input.eventTypeSlug;
    if (ctx.input.username) body.username = ctx.input.username;
    if (ctx.input.guests) body.guests = ctx.input.guests;
    if (ctx.input.location) body.location = ctx.input.location;
    if (ctx.input.meetingUrl) body.meetingUrl = ctx.input.meetingUrl;
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.metadata) body.metadata = ctx.input.metadata;
    if (ctx.input.bookingFieldsResponses)
      body.bookingFieldsResponses = ctx.input.bookingFieldsResponses;

    let booking = await client.createBooking(body);

    return {
      output: { booking },
      message: `Booking created for **${ctx.input.attendeeName}** (${ctx.input.attendeeEmail}) starting at ${ctx.input.start}.`
    };
  })
  .build();
