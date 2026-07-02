import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let eventSuccessful = SlateTrigger.create(spec, {
  name: 'Event Delivered Successfully',
  key: 'event_successful',
  description:
    'Triggers when an event is successfully delivered to a destination. Contains the payload of the response from the destination URL. Useful for implementing asynchronous response workflows.'
})
  .input(
    z.object({
      topic: z.string().describe('Notification topic'),
      eventId: z.string().describe('Event ID'),
      connectionId: z.string().optional().describe('Connection ID'),
      destinationResponse: z
        .unknown()
        .optional()
        .describe('Response payload from the destination'),
      raw: z.record(z.string(), z.unknown()).describe('Raw notification payload')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Event ID that was successfully delivered'),
      connectionId: z.string().optional().describe('Connection ID for the event'),
      sourceId: z.string().optional().describe('Source ID'),
      destinationId: z.string().optional().describe('Destination ID'),
      responseStatus: z
        .number()
        .optional()
        .describe('HTTP response status from the destination'),
      destinationResponse: z
        .unknown()
        .optional()
        .describe('Response payload from the destination URL')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

      let source = await client.createSource({
        name: `slates-event-success-${Date.now()}`,
        description: 'Auto-registered source for Slates event.successful notifications'
      });

      await client.updateWebhookNotifications({
        enabled: true,
        source_id: source.id,
        topics: ['event.successful']
      });

      let destination = await client.createDestination({
        name: `slates-event-success-dest-${Date.now()}`,
        description: 'Auto-registered destination for Slates event.successful notifications',
        config: {
          url: ctx.input.webhookBaseUrl
        }
      });

      let connection = await client.createConnection({
        name: `slates-event-success-conn-${Date.now()}`,
        source_id: source.id,
        destination_id: destination.id
      });

      return {
        registrationDetails: {
          sourceId: source.id,
          destinationId: destination.id,
          connectionId: connection.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
      let details = ctx.input.registrationDetails as {
        sourceId: string;
        destinationId: string;
        connectionId: string;
      };

      try {
        await client.deleteConnection(details.connectionId);
      } catch (_e) {
        /* ignore */
      }
      try {
        await client.deleteDestination(details.destinationId);
      } catch (_e) {
        /* ignore */
      }
      try {
        await client.deleteSource(details.sourceId);
      } catch (_e) {
        /* ignore */
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let topic = (data.topic as string) || 'event.successful';
      let eventData = (data.data || data) as Record<string, unknown>;
      let connection = (data.connection || {}) as Record<string, unknown>;

      return {
        inputs: [
          {
            topic,
            eventId: (data.event_id || eventData.id || '') as string,
            connectionId: (connection.id || data.webhook_id || '') as string | undefined,
            destinationResponse: data.attempt_response || eventData.response,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.raw as Record<string, unknown>;
      let eventData = (raw.data || raw) as Record<string, unknown>;
      let connection = (raw.connection || {}) as Record<string, unknown>;

      return {
        type: 'event.successful',
        id: ctx.input.eventId || `event-${Date.now()}`,
        output: {
          eventId: ctx.input.eventId,
          connectionId: ctx.input.connectionId,
          sourceId: (eventData.source_id || connection.source_id) as string | undefined,
          destinationId: (eventData.destination_id || connection.destination_id) as
            | string
            | undefined,
          responseStatus: (eventData.response_status || raw.response_status) as
            | number
            | undefined,
          destinationResponse: ctx.input.destinationResponse
        }
      };
    }
  })
  .build();
