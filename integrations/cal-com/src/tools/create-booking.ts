import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { calComServiceError } from '../lib/errors';
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
      teamSlug: z
        .string()
        .optional()
        .describe(
          'Team slug of the event type owner (used with eventTypeSlug for team event types)'
        ),
      organizationSlug: z
        .string()
        .optional()
        .describe('Organization slug when booking an organization user or team event type'),
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
      attendeeLanguage: z
        .string()
        .optional()
        .describe('Optional attendee language code, such as en or it'),
      guests: z
        .array(z.string())
        .optional()
        .describe('List of guest email addresses to include'),
      location: z
        .any()
        .optional()
        .describe(
          'Cal.com location object, for example { "type": "address", "address": "..." }'
        ),
      meetingUrl: z.string().optional().describe('Custom meeting URL'),
      notes: z.string().optional().describe('Additional notes or comments for the booking'),
      lengthInMinutes: z
        .number()
        .optional()
        .describe('Requested duration for event types that support variable durations'),
      routing: z
        .any()
        .optional()
        .describe('Routing form response details for routed bookings'),
      emailVerificationCode: z
        .string()
        .optional()
        .describe('Email verification code when the event type requires email verification'),
      allowConflicts: z.boolean().optional().describe('Allow booking even if conflicts exist'),
      allowBookingOutOfBounds: z
        .boolean()
        .optional()
        .describe('Allow booking outside the configured event bounds'),
      instant: z
        .boolean()
        .optional()
        .describe('Create an instant meeting for supported team event types'),
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

    if (!ctx.input.eventTypeId && !ctx.input.eventTypeSlug) {
      throw calComServiceError(
        'Provide eventTypeId, or provide eventTypeSlug with username or teamSlug.'
      );
    }

    if (ctx.input.eventTypeSlug && !ctx.input.username && !ctx.input.teamSlug) {
      throw calComServiceError(
        'username or teamSlug is required when booking by eventTypeSlug.'
      );
    }

    let body: Record<string, any> = {
      start: ctx.input.start,
      attendee: {
        name: ctx.input.attendeeName,
        email: ctx.input.attendeeEmail,
        timeZone: ctx.input.attendeeTimeZone,
        phoneNumber: ctx.input.attendeePhoneNumber,
        language: ctx.input.attendeeLanguage
      }
    };

    if (ctx.input.eventTypeId) body.eventTypeId = ctx.input.eventTypeId;
    if (ctx.input.eventTypeSlug) body.eventTypeSlug = ctx.input.eventTypeSlug;
    if (ctx.input.username) body.username = ctx.input.username;
    if (ctx.input.teamSlug) body.teamSlug = ctx.input.teamSlug;
    if (ctx.input.organizationSlug) body.organizationSlug = ctx.input.organizationSlug;
    if (ctx.input.guests) body.guests = ctx.input.guests;
    if (ctx.input.location) body.location = ctx.input.location;
    if (ctx.input.meetingUrl) body.meetingUrl = ctx.input.meetingUrl;
    if (ctx.input.notes) body.notes = ctx.input.notes;
    if (ctx.input.lengthInMinutes) body.lengthInMinutes = ctx.input.lengthInMinutes;
    if (ctx.input.routing) body.routing = ctx.input.routing;
    if (ctx.input.emailVerificationCode)
      body.emailVerificationCode = ctx.input.emailVerificationCode;
    if (ctx.input.allowConflicts !== undefined) body.allowConflicts = ctx.input.allowConflicts;
    if (ctx.input.allowBookingOutOfBounds !== undefined)
      body.allowBookingOutOfBounds = ctx.input.allowBookingOutOfBounds;
    if (ctx.input.instant !== undefined) body.instant = ctx.input.instant;
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
