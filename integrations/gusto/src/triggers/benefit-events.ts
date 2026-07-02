import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let benefitEvents = SlateTrigger.create(spec, {
  name: 'Benefit Events',
  key: 'benefit_events',
  description:
    'Triggered when company benefit or employee benefit enrollment events occur, including creation, updates, and deletion of benefits and enrollments.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., company_benefit.created, employee_benefit.updated)'),
      eventId: z.string().describe('Unique identifier for this event'),
      entityId: z.string().describe('UUID of the affected benefit or enrollment'),
      companyId: z.string().describe('UUID of the company'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      resourceUrl: z.string().optional().describe('URL to fetch the full resource'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      benefitId: z
        .string()
        .describe('UUID of the company benefit or employee benefit enrollment'),
      companyId: z.string().describe('UUID of the company'),
      eventType: z.string().describe('Type of benefit event'),
      timestamp: z.string().describe('When the event occurred'),
      resourceUrl: z.string().optional().describe('URL to fetch the full resource')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type || '';
      let entityUuid = body.entity_uuid || body.resource_uuid || '';
      let companyUuid = body.company_uuid || '';
      let timestamp = body.timestamp || new Date().toISOString();
      let resourceUrl = body.resource_url || '';
      let eventId = body.event_uuid || `${eventType}-${entityUuid}-${timestamp}`;

      if (
        !eventType.startsWith('company_benefit.') &&
        !eventType.startsWith('employee_benefit.')
      ) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId,
            entityId: entityUuid,
            companyId: companyUuid,
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
          benefitId: ctx.input.entityId,
          companyId: ctx.input.companyId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          resourceUrl: ctx.input.resourceUrl
        }
      };
    }
  })
  .build();
