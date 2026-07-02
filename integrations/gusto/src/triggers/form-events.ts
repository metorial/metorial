import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formEvents = SlateTrigger.create(spec, {
  name: 'Form & Document Events',
  key: 'form_events',
  description:
    'Triggered when form or document events occur, including creation, updates, signing, and document generation success or failure.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The event type (e.g., form.created, form.signed, document.created)'),
      eventId: z.string().describe('Unique identifier for this event'),
      entityId: z.string().describe('UUID of the affected form or document'),
      companyId: z.string().describe('UUID of the company'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      resourceUrl: z.string().optional().describe('URL to fetch the full resource'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      formOrDocumentId: z.string().describe('UUID of the form or document'),
      companyId: z.string().describe('UUID of the company'),
      eventType: z.string().describe('Type of form/document event'),
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
        !eventType.startsWith('form.') &&
        !eventType.startsWith('document.') &&
        !eventType.startsWith('generated_document.')
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
          formOrDocumentId: ctx.input.entityId,
          companyId: ctx.input.companyId,
          eventType: ctx.input.eventType,
          timestamp: ctx.input.timestamp,
          resourceUrl: ctx.input.resourceUrl
        }
      };
    }
  })
  .build();
