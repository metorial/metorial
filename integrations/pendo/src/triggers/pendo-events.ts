import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let pendoEvents = SlateTrigger.create(spec, {
  name: 'Pendo Events',
  key: 'pendo_events',
  description:
    'Receives webhook events from Pendo including guide displayed, track events received, NPS/poll events, visitor/account created, and email unsubscribe events. Configure webhooks in Pendo under Settings > Integrations > Webhooks.',
  instructions: [
    'Configure the webhook URL in Pendo under Settings > Integrations > Webhooks.',
    'Select the event categories you want to receive.',
    'Webhook payloads are signed with SHA-256 HMAC via the X-Pendo-Signature header.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('The type of Pendo event'),
      eventId: z.string().describe('Unique identifier for deduplication'),
      visitorId: z.string().optional().describe('Visitor ID associated with the event'),
      accountId: z.string().optional().describe('Account ID associated with the event'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      properties: z.any().optional().describe('Event-specific properties'),
      raw: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      visitorId: z.string().optional().describe('Visitor ID associated with the event'),
      accountId: z.string().optional().describe('Account ID associated with the event'),
      timestamp: z.string().optional().describe('When the event occurred'),
      guideId: z.string().optional().describe('Guide ID if this is a guide-related event'),
      guideName: z.string().optional().describe('Guide name if this is a guide-related event'),
      stepId: z.string().optional().describe('Guide step ID if applicable'),
      trackEventName: z
        .string()
        .optional()
        .describe('Track event name if this is a track event'),
      npsRating: z.number().optional().describe('NPS rating if this is an NPS submission'),
      pollResponse: z
        .string()
        .optional()
        .describe('Poll response if this is a poll submission'),
      properties: z.any().optional().describe('Additional event-specific properties'),
      raw: z.any().describe('Full raw webhook payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Pendo may send single events or arrays
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => {
        let eventType = resolveEventType(event);
        let eventId =
          event.id ||
          event.eventId ||
          `${eventType}-${event.visitorId || ''}-${event.timestamp || Date.now()}`;

        return {
          eventType,
          eventId: String(eventId),
          visitorId: event.visitorId,
          accountId: event.accountId,
          timestamp: event.timestamp ? String(event.timestamp) : undefined,
          properties: event.properties || event.eventProperties,
          raw: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let event = ctx.input.raw || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          visitorId: ctx.input.visitorId,
          accountId: ctx.input.accountId,
          timestamp: ctx.input.timestamp,
          guideId: event.guideId,
          guideName: event.guideName,
          stepId: event.stepId || event.guideStepId,
          trackEventName: event.trackEventName || event.event || event.trackType,
          npsRating: event.npsRating ?? event.rating,
          pollResponse: event.pollResponse ?? event.response,
          properties: ctx.input.properties,
          raw: event
        }
      };
    }
  })
  .build();

let resolveEventType = (event: any): string => {
  let type = event.type || event.eventType || '';
  let normalized = String(type).toLowerCase().replace(/\s+/g, '_');

  if (normalized.includes('guide') && normalized.includes('display')) return 'guide.displayed';
  if (normalized.includes('track') && normalized.includes('event'))
    return 'track_event.received';
  if (normalized.includes('nps') && normalized.includes('display'))
    return 'nps_survey.displayed';
  if (normalized.includes('nps') && normalized.includes('submit'))
    return 'nps_survey.submitted';
  if (normalized.includes('poll') && normalized.includes('display')) return 'poll.displayed';
  if (normalized.includes('poll') && normalized.includes('submit')) return 'poll.submitted';
  if (normalized.includes('visitor') && normalized.includes('creat')) return 'visitor.created';
  if (normalized.includes('account') && normalized.includes('creat')) return 'account.created';
  if (normalized.includes('unsubscrib')) return 'visitor.unsubscribed';

  return normalized || 'pendo.unknown';
};
