import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let memoryEvents = SlateTrigger.create(spec, {
  name: 'Memory Events',
  key: 'memory_events',
  description:
    'Triggered when memories are created, updated, or deleted in Mem0. Receives real-time webhook notifications for memory lifecycle events.'
})
  .input(
    z.object({
      eventType: z.enum(['add', 'update', 'delete']).describe('Type of memory event'),
      eventId: z.string().describe('Unique event identifier'),
      memoryId: z.string().describe('ID of the affected memory'),
      memory: z.string().describe('Memory content text'),
      rawEvent: z.string().describe('Raw event type from Mem0 (ADD, UPDATE, DELETE)')
    })
  )
  .output(
    z.object({
      memoryId: z.string().describe('Unique identifier of the affected memory'),
      memory: z.string().describe('Memory content text'),
      eventType: z.string().describe('Type of event: add, update, or delete')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let projectId = ctx.config.projectId;

      if (!projectId) {
        throw new Error(
          'projectId is required in configuration to register webhooks. Set it in the Mem0 provider config.'
        );
      }

      let client = new Client({
        token: ctx.auth.token,
        orgId: ctx.config.orgId,
        projectId
      });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        name: 'Slates Memory Events Webhook',
        projectId,
        eventTypes: ['memory_add', 'memory_update', 'memory_delete']
      });

      return {
        registrationDetails: {
          webhookId: result.webhook_id || result.id || '',
          projectId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let details = ctx.input.registrationDetails as { webhookId: string; projectId: string };

      if (!details?.webhookId) {
        return;
      }

      let client = new Client({
        token: ctx.auth.token,
        orgId: ctx.config.orgId,
        projectId: ctx.config.projectId
      });

      await client.deleteWebhook(String(details.webhookId));
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      // Mem0 sends: { event_details: { id, data: { memory }, event: "ADD" } }
      let eventDetails = (body.event_details || body) as Record<string, unknown>;
      let eventData = (eventDetails.data || {}) as Record<string, unknown>;
      let rawEvent = String(eventDetails.event || '').toUpperCase();

      let eventTypeMap: Record<string, string> = {
        ADD: 'add',
        UPDATE: 'update',
        DELETE: 'delete'
      };

      let eventType = eventTypeMap[rawEvent] || 'add';
      let memoryId = String(eventDetails.id || '');
      let memory = String(eventData.memory || '');

      // Use a combination of memoryId and event type for deduplication
      let eventId = `${memoryId}-${rawEvent}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType: eventType as 'add' | 'update' | 'delete',
            eventId,
            memoryId,
            memory,
            rawEvent
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `memory.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          memoryId: ctx.input.memoryId,
          memory: ctx.input.memory,
          eventType: ctx.input.eventType
        }
      };
    }
  })
  .build();
