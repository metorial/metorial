import { z } from 'zod';
import type { Booking, ResourceReference } from './types';

let customFieldSchema = z.object({
  name: z.string().describe('Field name'),
  value: z.string().describe('Field value as text, or JSON text for a structured value'),
  valueData: z.unknown().optional().describe('Original field value returned by OnceHub')
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

export let bookingSchema = z.object({
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
    .describe('Cancel/reschedule details; a single provider object is returned as one entry'),
  attendees: z.array(z.string()).describe('Attendee email addresses'),
  formSubmission: formSubmissionSchema.describe('Submitted form data from the customer'),
  bookingPageId: z.string().nullable().describe('Associated booking page ID'),
  masterPageId: z.string().nullable().describe('Associated master page ID'),
  eventTypeId: z.string().nullable().describe('Associated event type ID'),
  bookingCalendarId: z.string().nullable().describe('Associated booking calendar ID'),
  contactId: z.string().nullable().describe('Associated contact ID'),
  conversationId: z.string().nullable().describe('Associated conversation ID'),
  cancelUrl: z.string().nullable().describe('Provider link for canceling the booking'),
  rescheduleUrl: z.string().nullable().describe('Provider link for rescheduling the booking'),
  expandedObjects: z
    .record(z.string(), z.unknown())
    .describe(
      'Expanded owner, contact, conversation, and scheduling resources, keyed by field'
    )
});

let referenceId = (reference?: ResourceReference | null) =>
  typeof reference === 'string' ? reference : (reference?.id ?? null);

export let formatBooking = (booking: Booking) => {
  let cancellation = booking.cancel_reschedule_information;
  let cancellationEntries = cancellation
    ? Array.isArray(cancellation)
      ? cancellation
      : [cancellation]
    : null;
  let form = booking.form_submission;
  let expandedObjects: Record<string, unknown> = {};
  for (let field of [
    'owner',
    'booking_page',
    'master_page',
    'event_type',
    'booking_calendar',
    'contact',
    'conversation'
  ] as const) {
    let reference = booking[field];
    if (reference && typeof reference === 'object') expandedObjects[field] = reference;
  }

  return {
    bookingId: booking.id,
    trackingId: booking.tracking_id,
    subject: booking.subject,
    status: booking.status,
    creationTime: booking.creation_time,
    startingTime: booking.starting_time,
    customerTimezone: booking.customer_timezone,
    lastUpdatedTime: booking.last_updated_time,
    owner: referenceId(booking.owner) ?? '',
    durationMinutes: booking.duration_minutes,
    virtualConferencingUrl: booking.virtual_conferencing?.join_url ?? null,
    locationDescription: booking.location_description ?? null,
    rescheduledBookingId: booking.rescheduled_booking_id ?? null,
    cancelRescheduleInformation:
      cancellationEntries?.map(info => ({
        reason: info.reason ?? null,
        actionedBy: info.actioned_by,
        userId: info.user_id ?? null
      })) ?? null,
    attendees: booking.attendees ?? [],
    formSubmission: form
      ? {
          name: form.name ?? null,
          email: form.email ?? null,
          phone: form.phone ?? null,
          mobilePhone: form.mobile_phone ?? null,
          note: form.note ?? null,
          company: form.company ?? null,
          guests: form.guests ?? [],
          customFields: (form.custom_fields ?? []).map(field => ({
            name: field.name,
            value:
              typeof field.value === 'string'
                ? field.value
                : (JSON.stringify(field.value) ?? 'null'),
            valueData: field.value
          }))
        }
      : null,
    bookingPageId: referenceId(booking.booking_page),
    masterPageId: referenceId(booking.master_page),
    eventTypeId: referenceId(booking.event_type),
    bookingCalendarId: referenceId(booking.booking_calendar),
    contactId: referenceId(booking.contact),
    conversationId: referenceId(booking.conversation),
    cancelUrl: booking.cancel_url ?? null,
    rescheduleUrl: booking.reschedule_url ?? null,
    expandedObjects
  };
};
