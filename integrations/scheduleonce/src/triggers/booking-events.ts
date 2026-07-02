import { SlateTrigger } from 'slates';
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

export let bookingEvents = SlateTrigger.create(spec, {
  name: 'Booking Events',
  key: 'booking_events',
  description:
    'Triggers on booking lifecycle events including scheduled, rescheduled, canceled, completed, and no-show.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      eventType: z.string().describe('Type of booking event'),
      eventCreationTime: z.string().describe('ISO 8601 timestamp of when the event occurred'),
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
      formSubmission: formSubmissionSchema.describe('Submitted form data from the customer')
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
      eventCreationTime: z.string().describe('ISO 8601 timestamp of when the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook(
        `slates-booking-events-${Date.now()}`,
        ctx.input.webhookBaseUrl,
        ['booking']
      );

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let event = (await ctx.request.json()) as any;

      let booking = event.data;
      if (!booking?.id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventId: event.id,
            eventType: event.type,
            eventCreationTime: event.creation_time,
            bookingId: booking.id,
            trackingId: booking.tracking_id || '',
            subject: booking.subject || '',
            status: booking.status || '',
            creationTime: booking.creation_time || '',
            startingTime: booking.starting_time || '',
            customerTimezone: booking.customer_timezone || '',
            lastUpdatedTime: booking.last_updated_time || '',
            owner: booking.owner || '',
            durationMinutes: booking.duration_minutes || 0,
            virtualConferencingUrl: booking.virtual_conferencing?.join_url ?? null,
            locationDescription: booking.location_description ?? null,
            rescheduledBookingId: booking.rescheduled_booking_id ?? null,
            cancelRescheduleInformation:
              booking.cancel_reschedule_information?.map((info: any) => ({
                reason: info.reason ?? null,
                actionedBy: info.actioned_by || '',
                userId: info.user_id ?? null
              })) ?? null,
            attendees: booking.attendees || [],
            formSubmission: booking.form_submission
              ? {
                  name: booking.form_submission.name ?? null,
                  email: booking.form_submission.email ?? null,
                  phone: booking.form_submission.phone ?? null,
                  mobilePhone: booking.form_submission.mobile_phone ?? null,
                  note: booking.form_submission.note ?? null,
                  company: booking.form_submission.company ?? null,
                  guests: booking.form_submission.guests || [],
                  customFields: (booking.form_submission.custom_fields || []).map(
                    (cf: any) => ({
                      name: cf.name,
                      value: cf.value
                    })
                  )
                }
              : null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          bookingId: ctx.input.bookingId,
          trackingId: ctx.input.trackingId,
          subject: ctx.input.subject,
          status: ctx.input.status,
          creationTime: ctx.input.creationTime,
          startingTime: ctx.input.startingTime,
          customerTimezone: ctx.input.customerTimezone,
          lastUpdatedTime: ctx.input.lastUpdatedTime,
          owner: ctx.input.owner,
          durationMinutes: ctx.input.durationMinutes,
          virtualConferencingUrl: ctx.input.virtualConferencingUrl,
          locationDescription: ctx.input.locationDescription,
          rescheduledBookingId: ctx.input.rescheduledBookingId,
          cancelRescheduleInformation: ctx.input.cancelRescheduleInformation,
          attendees: ctx.input.attendees,
          formSubmission: ctx.input.formSubmission,
          eventCreationTime: ctx.input.eventCreationTime
        }
      };
    }
  })
  .build();
