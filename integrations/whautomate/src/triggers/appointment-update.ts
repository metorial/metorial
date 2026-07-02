import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let appointmentUpdate = SlateTrigger.create(spec, {
  name: 'Appointment Update',
  key: 'appointment_update',
  description:
    'Triggered when an appointment is booked, rescheduled, cancelled, visited, waitlisted, or marked as no-show.'
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type'),
      eventId: z.string().describe('Unique event ID'),
      eventTimestamp: z.string().describe('Event timestamp'),
      appointment: z
        .record(z.string(), z.any())
        .describe('Appointment payload from the webhook')
    })
  )
  .output(
    z.object({
      appointmentId: z.string().describe('Appointment ID'),
      status: z
        .string()
        .optional()
        .describe(
          'Appointment status (Booked, Rescheduled, Cancelled, Visited, Waitlisted, No-Show)'
        ),
      clientId: z.string().optional().describe('Client ID'),
      clientName: z.string().optional().describe('Client full name'),
      clientPhone: z.string().optional().describe('Client phone number'),
      clientEmail: z.string().optional().describe('Client email'),
      staffId: z.string().optional().describe('Staff member ID'),
      staffName: z.string().optional().describe('Staff member name'),
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      locationId: z.string().optional().describe('Location ID'),
      locationTitle: z.string().optional().describe('Location name'),
      date: z.string().optional().describe('Appointment date (YYYY-MM-DD)'),
      time: z.string().optional().describe('Appointment time (HH:MM AM/PM)'),
      startTimeUtc: z.string().optional().describe('Start time in UTC'),
      endTimeUtc: z.string().optional().describe('End time in UTC'),
      timezone: z.string().optional().describe('Timezone'),
      appointmentType: z
        .string()
        .optional()
        .describe('Appointment type (e.g., LOCATION_VISIT)'),
      paymentStatus: z.string().optional().describe('Payment status'),
      notes: z.string().optional().describe('Appointment notes'),
      bookedFrom: z.string().optional().describe('Booking source'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      let result = await client.createWebhook({
        serverUrl: ctx.input.webhookBaseUrl,
        eventTypes: ['appointment_updates'],
        isActive: true
      });

      return {
        registrationDetails: {
          webhookId: result.id || result._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiHost: ctx.config.apiHost
      });

      if (ctx.input.registrationDetails?.webhookId) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let event = data.event || {};
      let appointment = data.appointment || data;

      return {
        inputs: [
          {
            eventType: event.type || 'appointment_updates',
            eventId: event.id || appointment.id || appointment._id || crypto.randomUUID(),
            eventTimestamp:
              event.timeStamp || appointment.updatedAt || new Date().toISOString(),
            appointment
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let appt = ctx.input.appointment;

      let statusLower = (appt.status || 'updated').toLowerCase().replace('-', '_');

      return {
        type: `appointment.${statusLower}`,
        id: ctx.input.eventId,
        output: {
          appointmentId: appt.id || appt._id || ctx.input.eventId,
          status: appt.status,
          clientId: appt.client?.id,
          clientName: appt.client?.fullName,
          clientPhone: appt.client?.phone,
          clientEmail: appt.client?.email,
          staffId: appt.staff?.id,
          staffName: appt.staff?.name,
          serviceId: appt.service?.id,
          serviceName: appt.service?.name,
          locationId: appt.location?.id,
          locationTitle: appt.location?.title,
          date: appt.date,
          time: appt.time,
          startTimeUtc: appt.startTimeUTC,
          endTimeUtc: appt.endTimeUTC,
          timezone: appt.timezone,
          appointmentType: appt.appointmentType,
          paymentStatus: appt.paymentStatus,
          notes: appt.notes,
          bookedFrom: appt.bookedFrom,
          createdAt: appt.createdAt,
          updatedAt: appt.updatedAt
        }
      };
    }
  })
  .build();
