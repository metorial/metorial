import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let employeeEvents = SlateTrigger.create(spec, {
  name: 'Employee Events',
  key: 'employee_events',
  description:
    'Triggered when employee lifecycle events occur, including creation, updates, onboarding, termination, rehire, and deletion.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., employee.created, employee.updated)'),
      eventId: z.string().describe('Unique identifier for this event'),
      entityId: z.string().describe('UUID of the affected employee'),
      companyId: z.string().describe('UUID of the company'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      resourceUrl: z.string().optional().describe('URL to fetch the full resource'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('UUID of the employee'),
      companyId: z.string().describe('UUID of the company'),
      eventType: z.string().describe('Type of employee event'),
      timestamp: z.string().describe('When the event occurred'),
      resourceUrl: z.string().optional().describe('URL to fetch the full employee resource')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Gusto webhook payload structure
      let eventType = body.event_type || '';
      let entityUuid = body.entity_uuid || body.resource_uuid || '';
      let companyUuid = body.company_uuid || '';
      let timestamp = body.timestamp || new Date().toISOString();
      let resourceUrl = body.resource_url || '';
      let eventId = body.event_uuid || `${eventType}-${entityUuid}-${timestamp}`;

      // Only process employee-related events
      if (!eventType.startsWith('employee.')) {
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
          employeeId: ctx.input.entityId,
          companyId: ctx.input.companyId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          resourceUrl: ctx.input.resourceUrl
        }
      };
    }
  })
  .build();
