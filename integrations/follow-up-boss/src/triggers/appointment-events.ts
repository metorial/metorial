import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let appointmentEventTypes = [
  'appointmentsCreated',
  'appointmentsUpdated',
  'appointmentsDeleted'
] as const;

export let appointmentEvents = SlateTrigger.create(spec, {
  name: 'Appointment Events',
  key: 'appointment_events',
  description:
    'Triggered when appointments are created, updated, or deleted. Only fires for appointments created in Follow Up Boss, not synced calendar appointments.'
})
  .input(
    z.object({
      eventType: z.enum(appointmentEventTypes).describe('Type of appointment event'),
      eventId: z.string().describe('Unique event ID'),
      appointmentId: z.number().describe('Appointment ID affected'),
      resourceUri: z.string().optional().describe('URI to fetch the full resource'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      appointmentId: z.number().describe('Appointment ID'),
      eventType: z.string().describe('Type of event'),
      resourceUri: z.string().optional(),
      timestamp: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let registeredWebhooks: Array<{ webhookId: number; event: string }> = [];

      for (let eventType of appointmentEventTypes) {
        let result = await client.createWebhook({
          event: eventType,
          url: ctx.input.webhookBaseUrl
        });
        registeredWebhooks.push({ webhookId: result.id, event: eventType });
      }

      return { registrationDetails: { webhooks: registeredWebhooks } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhooks = ctx.input.registrationDetails?.webhooks || [];
      for (let wh of webhooks) {
        try {
          await client.deleteWebhook(wh.webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            eventId: String(data.eventId),
            appointmentId: data.resourceIds?.[0] || 0,
            resourceUri: data.uri,
            timestamp: data.timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let action = ctx.input.eventType.replace('appointments', '').toLowerCase();

      return {
        type: `appointment.${action}`,
        id: ctx.input.eventId,
        output: {
          appointmentId: ctx.input.appointmentId,
          eventType: ctx.input.eventType,
          resourceUri: ctx.input.resourceUri,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
