import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

let documentEventTypes = [
  'document_created',
  'document_sent',
  'document_viewed',
  'document_in_progress',
  'document_signed',
  'document_completed',
  'document_expired',
  'document_canceled',
  'document_declined',
  'document_bounced',
  'document_error'
] as const;

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggers when a document lifecycle event occurs, such as created, sent, viewed, signed, completed, expired, canceled, declined, bounced, or error.'
})
  .input(
    z.object({
      eventType: z.enum(documentEventTypes).describe('The type of document event'),
      documentId: z.string().describe('ID of the document'),
      documentName: z.string().optional().describe('Name of the document'),
      status: z.string().optional().describe('Current document status'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional(),
            name: z.string().optional(),
            email: z.string().optional(),
            status: z.string().optional(),
            signedAt: z.string().optional()
          })
        )
        .optional()
        .describe('Document recipients'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata attached to the document'),
      createdAt: z.string().optional().describe('Document creation timestamp'),
      completedAt: z.string().optional().describe('Document completion timestamp'),
      rawEvent: z.any().optional().describe('Full raw event payload from SignWell')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the document'),
      documentName: z.string().optional().describe('Name of the document'),
      status: z.string().optional().describe('Current document status'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional().describe('ID of the recipient'),
            name: z.string().optional().describe('Recipient name'),
            email: z.string().optional().describe('Recipient email'),
            status: z.string().optional().describe('Recipient signing status'),
            signedAt: z.string().optional().describe('When the recipient signed')
          })
        )
        .optional()
        .describe('Document recipients and their statuses'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SignWellClient({ token: ctx.auth.token });

      let result = await client.createWebhook(ctx.input.webhookBaseUrl, ctx.config.testMode);

      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SignWellClient({ token: ctx.auth.token });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // SignWell sends the event type and document data in the webhook payload
      let eventType = body.event_type || body.event;
      let doc = body.document || body;

      let recipients = (doc.recipients || []).map((r: any) => ({
        recipientId: r.id,
        name: r.name,
        email: r.email,
        status: r.status,
        signedAt: r.signed_at
      }));

      return {
        inputs: [
          {
            eventType: eventType,
            documentId: doc.id,
            documentName: doc.name,
            status: doc.status,
            recipients,
            metadata: doc.metadata,
            createdAt: doc.created_at,
            completedAt: doc.completed_at,
            rawEvent: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `document.${ctx.input.eventType.replace('document_', '')}`,
        id: `${ctx.input.documentId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          status: ctx.input.status,
          recipients: ctx.input.recipients,
          metadata: ctx.input.metadata,
          createdAt: ctx.input.createdAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
