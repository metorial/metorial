import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customFieldSchema = z.object({
  name: z.string().describe('Field name'),
  value: z.string().describe('Field value')
});

let formSubmissionSchema = z
  .object({
    name: z.string().nullable().describe('Customer name'),
    email: z.string().nullable().describe('Customer email'),
    phone: z.string().nullable().describe('Phone number'),
    mobilePhone: z.string().nullable().describe('Mobile phone number'),
    note: z.string().nullable().describe('Customer note or message'),
    company: z.string().nullable().describe('Company name'),
    guests: z.array(z.string()).describe('Guest email addresses'),
    customFields: z.array(customFieldSchema).describe('Custom form fields')
  })
  .nullable();

let cancelRescheduleInfoSchema = z.object({
  reason: z.string().nullable().describe('Reason for cancellation or reschedule'),
  actionedBy: z.string().describe('Who performed the action: "user" or "customer"'),
  userId: z.string().nullable().describe('User ID if actioned by a user')
});

let bookingSchema = z.object({
  bookingId: z.string().describe('Unique booking identifier'),
  trackingId: z.string().describe('Booking tracking identifier'),
  subject: z.string().describe('Subject of the booking'),
  status: z
    .string()
    .describe(
      'Booking status: scheduled, rescheduled, completed, canceled, no_show, requested'
    ),
  creationTime: z.string().describe('ISO 8601 timestamp of booking creation'),
  startingTime: z.string().describe('ISO 8601 timestamp of the booking start'),
  customerTimezone: z.string().describe('Customer timezone'),
  lastUpdatedTime: z.string().describe('ISO 8601 timestamp of last update'),
  owner: z.string().describe('User ID of the booking owner'),
  durationMinutes: z.number().describe('Duration in minutes'),
  virtualConferencingUrl: z.string().nullable().describe('Virtual meeting join URL'),
  locationDescription: z.string().nullable().describe('Physical location description'),
  rescheduledBookingId: z.string().nullable().describe('ID of the rescheduled booking'),
  cancelRescheduleInformation: z
    .array(cancelRescheduleInfoSchema)
    .nullable()
    .describe('Cancel/reschedule details'),
  attendees: z.array(z.string()).describe('Attendee email addresses'),
  formSubmission: formSubmissionSchema.describe('Submitted form data from the customer')
});

export let listBookings = SlateTool.create(spec, {
  name: 'List Bookings',
  key: 'list_bookings',
  description: `Search and retrieve bookings from your ScheduleOnce account with flexible filtering.
Filter by starting time range, last updated time, creation time, status, owner, booking page, event type, or booking calendar.
Supports cursor-based pagination for navigating large result sets.`,
  instructions: [
    'Use ISO 8601 date strings for time filters (e.g., "2024-01-01T00:00:00Z").',
    'Combine multiple filters to narrow results. For example, filter by status and a time range.',
    'Use the "after" cursor from previous results to paginate through bookings.'
  ],
  constraints: ['Maximum 100 bookings per request (default 10).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startingTimeAfter: z
        .string()
        .optional()
        .describe('Return bookings starting after this ISO 8601 time'),
      startingTimeBefore: z
        .string()
        .optional()
        .describe('Return bookings starting before this ISO 8601 time'),
      lastUpdatedAfter: z
        .string()
        .optional()
        .describe('Return bookings updated after this ISO 8601 time'),
      createdAfter: z
        .string()
        .optional()
        .describe('Return bookings created after this ISO 8601 time'),
      status: z
        .enum(['requested', 'scheduled', 'rescheduled', 'completed', 'canceled', 'no_show'])
        .optional()
        .describe('Filter by booking status'),
      ownerUserId: z.string().optional().describe('Filter by booking owner user ID'),
      bookingPageId: z.string().optional().describe('Filter by booking page ID'),
      eventTypeId: z.string().optional().describe('Filter by event type ID'),
      bookingCalendarId: z.string().optional().describe('Filter by booking calendar ID'),
      limit: z
        .number()
        .optional()
        .describe('Number of bookings to return (1-100, default 10)'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor for pagination (use the last booking ID from previous results)')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of bookings matching the filter'),
      bookings: z.array(bookingSchema).describe('List of bookings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBookings({
      startingTimeGt: ctx.input.startingTimeAfter,
      startingTimeLt: ctx.input.startingTimeBefore,
      lastUpdatedTimeGt: ctx.input.lastUpdatedAfter,
      creationTimeGt: ctx.input.createdAfter,
      status: ctx.input.status,
      owner: ctx.input.ownerUserId,
      bookingPage: ctx.input.bookingPageId,
      eventType: ctx.input.eventTypeId,
      bookingCalendar: ctx.input.bookingCalendarId,
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let bookings = (result.data || []).map(b => ({
      bookingId: b.id,
      trackingId: b.tracking_id,
      subject: b.subject,
      status: b.status,
      creationTime: b.creation_time,
      startingTime: b.starting_time,
      customerTimezone: b.customer_timezone,
      lastUpdatedTime: b.last_updated_time,
      owner: b.owner,
      durationMinutes: b.duration_minutes,
      virtualConferencingUrl: b.virtual_conferencing?.join_url ?? null,
      locationDescription: b.location_description ?? null,
      rescheduledBookingId: b.rescheduled_booking_id ?? null,
      cancelRescheduleInformation:
        b.cancel_reschedule_information?.map(info => ({
          reason: info.reason,
          actionedBy: info.actioned_by,
          userId: info.user_id
        })) ?? null,
      attendees: b.attendees || [],
      formSubmission: b.form_submission
        ? {
            name: b.form_submission.name,
            email: b.form_submission.email,
            phone: b.form_submission.phone,
            mobilePhone: b.form_submission.mobile_phone,
            note: b.form_submission.note,
            company: b.form_submission.company,
            guests: b.form_submission.guests || [],
            customFields: (b.form_submission.custom_fields || []).map(cf => ({
              name: cf.name,
              value: cf.value
            }))
          }
        : null
    }));

    return {
      output: {
        count: result.count,
        bookings
      },
      message: `Found **${result.count}** booking(s). Returned **${bookings.length}** in this page.`
    };
  })
  .build();
