import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description:
    'Triggered when company lifecycle events occur, including provisioning, deprovisioning, updates, onboarding, approval status changes, and suspension events.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., company.updated, company.onboarded)'),
      eventId: z.string().describe('Unique identifier for this event'),
      entityId: z.string().describe('UUID of the affected company'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      resourceUrl: z.string().optional().describe('URL to fetch the full resource'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('UUID of the company'),
      eventType: z.string().describe('Type of company event'),
      timestamp: z.string().describe('When the event occurred'),
      resourceUrl: z.string().optional().describe('URL to fetch the full company resource')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type || '';
      let entityUuid = body.entity_uuid || body.resource_uuid || '';
      let timestamp = body.timestamp || new Date().toISOString();
      let resourceUrl = body.resource_url || '';
      let eventId = body.event_uuid || `${eventType}-${entityUuid}-${timestamp}`;

      if (!eventType.startsWith('company.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            entityId: entityUuid,
            timestamp,
            resourceUrl,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          companyId: ctx.input.entityId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          resourceUrl: ctx.input.resourceUrl
        }
      };
    }
  })
  .build();
