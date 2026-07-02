import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let appointmentEvents = SlateTrigger.create(spec, {
  name: 'Appointment Events',
  key: 'appointment_events',
  description: 'Triggers when an appointment is scheduled, rescheduled, canceled, or changed.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('The event action (scheduled, rescheduled, canceled, changed)'),
      appointmentId: z.number().describe('The appointment ID'),
      calendarId: z.number().optional().describe('The calendar ID'),
      appointmentTypeId: z.number().optional().describe('The appointment type ID')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('Appointment ID'),
      firstName: z.string().describe('Client first name'),
      lastName: z.string().describe('Client last name'),
      email: z.string().describe('Client email'),
      phone: z.string().describe('Client phone'),
      datetime: z.string().describe('Appointment date and time'),
      endTime: z.string().describe('Appointment end time'),
      duration: z.string().describe('Duration in minutes'),
      type: z.string().describe('Appointment type name'),
      appointmentTypeId: z.number().describe('Appointment type ID'),
      calendarId: z.number().describe('Calendar ID'),
      calendar: z.string().describe('Calendar name'),
      price: z.string().describe('Appointment price'),
      paid: z.string().describe('Payment status'),
      canceled: z.boolean().describe('Whether the appointment is canceled'),
      timezone: z.string().describe('Timezone'),
      notes: z.string().optional().describe('Appointment notes')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      // Register webhooks for all appointment event types
      let events = [
        'appointment.scheduled',
        'appointment.rescheduled',
        'appointment.canceled',
        'appointment.changed'
      ];

      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let event of events) {
        let webhook = await client.createWebhook({
          event,
          target: ctx.input.webhookBaseUrl
        });
        registeredWebhooks.push({ webhookId: webhook.id, event });
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: number; event: string }>;
      };

      for (let wh of details.webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      // Acuity sends application/x-www-form-urlencoded POST requests
      let body = await ctx.request.text();
      let params = new URLSearchParams(body);

      let action = params.get('action') || '';
      let id = params.get('id') || '';
      let calendarId = params.get('calendarID') || '';
      let appointmentTypeId = params.get('appointmentTypeID') || '';

      return {
        inputs: [
          {
            action,
            appointmentId: Number.parseInt(id, 10),
            calendarId: calendarId ? Number.parseInt(calendarId, 10) : undefined,
            appointmentTypeId: appointmentTypeId
              ? Number.parseInt(appointmentTypeId, 10)
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      // Fetch full appointment details
      let a = await client.getAppointment(ctx.input.appointmentId);

      let actionMap: Record<string, string> = {
        scheduled: 'appointment.scheduled',
        rescheduled: 'appointment.rescheduled',
        canceled: 'appointment.canceled',
        changed: 'appointment.changed'
      };

      let eventType = actionMap[ctx.input.action] || `appointment.${ctx.input.action}`;

      return {
        type: eventType,
        id: `${ctx.input.appointmentId}-${ctx.input.action}-${a.datetime || Date.now()}`,
        output: {
          appointmentId: a.id,
          firstName: a.firstName || '',
          lastName: a.lastName || '',
          email: a.email || '',
          phone: a.phone || '',
          datetime: a.datetime || '',
          endTime: a.endTime || '',
          duration: a.duration || '',
          type: a.type || '',
          appointmentTypeId: a.appointmentTypeID,
          calendarId: a.calendarID,
          calendar: a.calendar || '',
          price: a.price || '0',
          paid: a.paid || 'no',
          canceled: a.canceled || false,
          timezone: a.timezone || '',
          notes: a.notes || undefined
        }
      };
    }
  })
  .build();
