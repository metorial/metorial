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

export let getBooking = SlateTool.create(spec, {
  name: 'Get Booking',
  key: 'get_booking',
  description: `Retrieve detailed information about a specific booking by its ID.
Returns the full booking data including subject, duration, status, start time, location, virtual conferencing details, form submissions, attendees, and cancel/reschedule information.
Optionally expand embedded objects like booking page, event type, and owner.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bookingId: z.string().describe('The unique booking ID (e.g., "BKNG-J4FR05BKEWEX")'),
      expand: z
        .array(
          z.enum(['owner', 'booking_page', 'master_page', 'event_type', 'booking_calendar'])
        )
        .optional()
        .describe('Embedded objects to expand in the response')
    })
  )
  .output(
    z.object({
      bookingId: z.string().describe('Unique booking identifier'),
      trackingId: z.string().describe('Booking tracking identifier'),
      subject: z.string().describe('Subject of the booking'),
      status: z.string().describe('Booking status'),
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
      formSubmission: formSubmissionSchema.describe('Submitted form data from the customer'),
      bookingPageId: z.string().nullable().describe('Associated booking page ID'),
      masterPageId: z.string().nullable().describe('Associated master page ID'),
      eventTypeId: z.string().nullable().describe('Associated event type ID'),
      bookingCalendarId: z.string().nullable().describe('Associated booking calendar ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let b = await client.getBooking(ctx.input.bookingId, ctx.input.expand);

    return {
      output: {
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
          : null,
        bookingPageId: b.booking_page ?? null,
        masterPageId: b.master_page ?? null,
        eventTypeId: b.event_type ?? null,
        bookingCalendarId: b.booking_calendar ?? null
      },
      message: `Retrieved booking **${b.id}** — "${b.subject}" (${b.status}), starting at ${b.starting_time}.`
    };
  })
  .build();
