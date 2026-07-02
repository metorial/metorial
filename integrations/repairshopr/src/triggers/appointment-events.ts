import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let appointmentEvents = SlateTrigger.create(spec, {
  name: 'Appointment Events',
  key: 'appointment_events',
  description:
    'Triggers when an appointment is created or updated. Configure the webhook URL in RepairShopr under Admin > Notification Center.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of appointment event'),
      appointmentId: z.number().describe('Appointment ID'),
      webhookPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('Appointment ID'),
      summary: z.string().optional().describe('Appointment summary'),
      description: z.string().optional().describe('Description'),
      customerId: z.number().optional().describe('Customer ID'),
      ticketId: z.number().optional().describe('Associated ticket ID'),
      startAt: z.string().optional().describe('Start date/time'),
      endAt: z.string().optional().describe('End date/time'),
      location: z.string().optional().describe('Location'),
      allDay: z.boolean().optional().describe('Whether all-day event'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) return { inputs: [] };

      let appointment = body.appointment || body;
      let appointmentId = appointment.id || appointment.appointment_id;
      if (!appointmentId) return { inputs: [] };

      let eventType = body.type || body.event || body.action || 'updated';

      return {
        inputs: [
          {
            eventType: String(eventType),
            appointmentId: Number(appointmentId),
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let appointment =
        ctx.input.webhookPayload?.appointment || ctx.input.webhookPayload || {};
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');

      if (eventType.includes('creat') || eventType.includes('new')) {
        eventType = 'created';
      } else {
        eventType = 'updated';
      }

      return {
        type: `appointment.${eventType}`,
        id: `appointment_${ctx.input.appointmentId}_${eventType}_${appointment.updated_at || Date.now()}`,
        output: {
          appointmentId: ctx.input.appointmentId,
          summary: appointment.summary,
          description: appointment.description,
          customerId: appointment.customer_id,
          ticketId: appointment.ticket_id,
          startAt: appointment.start_at,
          endAt: appointment.end_at,
          location: appointment.location,
          allDay: appointment.all_day,
          createdAt: appointment.created_at,
          updatedAt: appointment.updated_at
        }
      };
    }
  })
  .build();
