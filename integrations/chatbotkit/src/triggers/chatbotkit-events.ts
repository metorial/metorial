import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let chatbotkitEventsTrigger = SlateTrigger.create(spec, {
  name: 'ChatBotKit Events',
  key: 'chatbotkit_events',
  description:
    'Receives webhook events from ChatBotKit including bot activity, conversation events, and integration operations. Configure the webhook URL in your ChatBotKit dashboard settings.',
  instructions: [
    'Set the webhook URL in your ChatBotKit dashboard to the provided endpoint URL.',
    'Configure a webhook secret in the dashboard for signature verification via the X-Hub-Signature header.'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type (e.g. bot.created, conversation.completed, integration.updated)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      resourceType: z.string().optional().describe('Resource type that triggered the event'),
      resourceId: z.string().optional().describe('Resource ID that triggered the event'),
      payload: z.record(z.string(), z.any()).optional().describe('Full event payload'),
      createdAt: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Event type'),
      resourceType: z.string().optional().describe('Resource type'),
      resourceId: z.string().optional().describe('Resource ID'),
      payload: z.record(z.string(), z.any()).optional().describe('Event payload data'),
      createdAt: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let request = ctx.request;
      let body: any;

      try {
        body = await request.json();
      } catch {
        return { inputs: [] };
      }

      // ChatBotKit may send webhook payloads in different formats
      // Handle both single event and array payloads
      let events = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => {
        let eventType = event.type || event.event || event.action || 'unknown';
        let eventId =
          event.id || event.eventId || `${eventType}-${event.createdAt || Date.now()}`;
        let resourceType = event.resourceType || eventType.split('.')[0] || undefined;
        let resourceId = event.resourceId || event.data?.id || event.id || undefined;

        return {
          eventType,
          eventId: String(eventId),
          resourceType,
          resourceId,
          payload: event.data || event,
          createdAt: event.createdAt || event.timestamp || undefined
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, resourceType, resourceId, payload, createdAt } = ctx.input;

      return {
        type: eventType,
        id: eventId,
        output: {
          eventType,
          resourceType,
          resourceId,
          payload,
          createdAt
        }
      };
    }
  })
  .build();
