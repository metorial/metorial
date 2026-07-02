import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let generalEvents = SlateTrigger.create(spec, {
  name: 'General Events',
  key: 'general_events',
  description:
    'Triggered for miscellaneous Gusto webhook events including bank account changes, location updates, signatory changes, pay schedule changes, employee address/compensation changes, notification events, and other resource events not covered by specialized triggers.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., bank_account.created, location.updated)'),
      eventId: z.string().describe('Unique identifier for this event'),
      entityId: z.string().describe('UUID of the affected resource'),
      companyId: z.string().describe('UUID of the company'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      resourceUrl: z.string().optional().describe('URL to fetch the full resource'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('UUID of the affected resource'),
      companyId: z.string().describe('UUID of the company'),
      eventType: z.string().describe('Type of event'),
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

      // This trigger handles events not covered by specialized triggers
      let specializedPrefixes = [
        'employee.',
        'company.',
        'payroll.',
        'contractor.',
        'contractor_payment.',
        'contractor_payment_group.',
        'company_benefit.',
        'employee_benefit.',
        'form.',
        'document.',
        'generated_document.'
      ];

      let isSpecialized = specializedPrefixes.some(prefix => eventType.startsWith(prefix));
      if (isSpecialized) {
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
          resourceId: ctx.input.entityId,
          companyId: ctx.input.companyId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          resourceUrl: ctx.input.resourceUrl
        }
      };
    }
  })
  .build();
