import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggers when document status changes (indexed, keyword_indexed, ready, failed) or when a document is deleted. Also fires when entities are extracted from a document.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type from the webhook payload'),
      nonce: z.string().describe('Unique idempotency nonce'),
      documentId: z.string().optional().describe('Document ID'),
      externalId: z.string().nullable().optional().describe('External ID'),
      status: z.string().optional().describe('Document status'),
      documentName: z.string().optional().describe('Document name'),
      partition: z.string().nullable().optional().describe('Document partition'),
      metadata: z.record(z.string(), z.any()).optional().describe('Document metadata'),
      connectionId: z
        .string()
        .nullable()
        .optional()
        .describe('Connection ID if from a connection'),
      error: z.string().nullable().optional().describe('Error message for failed status'),
      entityId: z.string().optional().describe('Entity ID for entity_extracted events'),
      instructionId: z
        .string()
        .optional()
        .describe('Instruction ID for entity_extracted events'),
      entityData: z.any().optional().describe('Extracted entity data')
    })
  )
  .output(
    z.object({
      documentId: z.string().optional().describe('ID of the affected document'),
      externalId: z.string().nullable().optional().describe('External reference ID'),
      documentName: z.string().optional().describe('Document name'),
      status: z.string().optional().describe('Current document status'),
      partition: z.string().nullable().optional().describe('Document partition'),
      metadata: z.record(z.string(), z.any()).optional().describe('Document metadata'),
      connectionId: z.string().nullable().optional().describe('Associated connection ID'),
      error: z
        .string()
        .nullable()
        .optional()
        .describe('Error details if document processing failed'),
      entityId: z.string().optional().describe('Entity ID for extraction events'),
      instructionId: z.string().optional().describe('Instruction ID for extraction events'),
      entityData: z.any().optional().describe('Extracted entity data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        partition: ctx.config.partition
      });

      let endpoint = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        name: 'Slates Document Events',
        partitionPattern: ctx.config.partition || undefined
      });

      return {
        registrationDetails: {
          endpointId: endpoint.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        partition: ctx.config.partition
      });

      if (ctx.input.registrationDetails?.endpointId) {
        await client.deleteWebhookEndpoint(ctx.input.registrationDetails.endpointId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType: string = body.type || '';
      let nonce: string = body.nonce || '';
      let payload = body.payload || {};

      let isDocumentEvent = [
        'document_status_updated',
        'document_deleted',
        'entity_extracted'
      ].includes(eventType);

      if (!isDocumentEvent) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            nonce,
            documentId: payload.document_id,
            externalId: payload.external_id ?? null,
            status: payload.status,
            documentName: payload.name,
            partition: payload.partition ?? null,
            metadata: payload.metadata || payload.document_metadata,
            connectionId: payload.connection_id ?? null,
            error: payload.error ?? null,
            entityId: payload.entity_id,
            instructionId: payload.instruction_id,
            entityData: payload.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.nonce,
        output: {
          documentId: ctx.input.documentId,
          externalId: ctx.input.externalId,
          documentName: ctx.input.documentName,
          status: ctx.input.status,
          partition: ctx.input.partition,
          metadata: ctx.input.metadata,
          connectionId: ctx.input.connectionId,
          error: ctx.input.error,
          entityId: ctx.input.entityId,
          instructionId: ctx.input.instructionId,
          entityData: ctx.input.entityData
        }
      };
    }
  })
  .build();
