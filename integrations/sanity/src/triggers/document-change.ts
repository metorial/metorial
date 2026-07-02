import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { spec } from '../spec';

export let documentChange = SlateTrigger.create(spec, {
  name: 'Document Change',
  key: 'document_change',
  description:
    'Triggers when a document in the Content Lake is created, updated, or deleted. Supports GROQ-based filtering for specific document types or conditions.'
})
  .input(
    z.object({
      documentId: z.string().describe('The ID of the affected document.'),
      eventType: z
        .enum(['create', 'update', 'delete'])
        .describe('The type of change that occurred.'),
      documentType: z.string().optional().describe('The _type of the affected document.'),
      document: z
        .any()
        .optional()
        .describe('The document after the change (not present for deletes).'),
      transactionId: z
        .string()
        .optional()
        .describe('The transaction ID that caused the change.')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('The ID of the affected document.'),
      documentType: z.string().optional().describe('The _type of the affected document.'),
      revision: z.string().optional().describe('The revision ID after the change.'),
      title: z.string().optional().describe('The title of the document, if available.'),
      createdAt: z.string().optional().describe('When the document was created.'),
      updatedAt: z.string().optional().describe('When the document was last updated.'),
      document: z.any().optional().describe('The full document after the change.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new SanityClient({
        token: ctx.auth.token,
        projectId: ctx.config.projectId,
        dataset: ctx.config.dataset,
        apiVersion: ctx.config.apiVersion
      });

      let result = await client.createWebhook({
        name: `Slates - Document Change`,
        url: ctx.input.webhookBaseUrl,
        dataset: ctx.config.dataset,
        apiVersion: ctx.config.apiVersion,
        rule: {
          on: ['create', 'update', 'delete']
        },
        httpMethod: 'POST'
      });

      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new SanityClient({
        token: ctx.auth.token,
        projectId: ctx.config.projectId,
        dataset: ctx.config.dataset,
        apiVersion: ctx.config.apiVersion
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let request = ctx.input.request;
      let body: any;
      try {
        body = await request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body || typeof body !== 'object') {
        return { inputs: [] };
      }

      // Sanity webhook payloads include the document directly when using default projection.
      // The _id and _type fields are present on the document payload.
      // For delete events, some fields may be absent.

      let documentId = body._id || body.documentId || '';
      let documentType = body._type || '';
      let transactionId = body._rev || body.transactionId || '';

      // Determine event type from the webhook headers or payload
      let eventType: 'create' | 'update' | 'delete' = 'update';

      let transitionHeader = request.headers.get('sanity-transaction-id');
      let operationHeader = request.headers.get('sanity-operation');

      if (operationHeader === 'create') {
        eventType = 'create';
      } else if (operationHeader === 'delete') {
        eventType = 'delete';
      } else if (operationHeader === 'update') {
        eventType = 'update';
      }

      // If we couldn't determine from headers, check if it looks like a delete
      if (!operationHeader && body._deleted) {
        eventType = 'delete';
      }

      return {
        inputs: [
          {
            documentId,
            eventType,
            documentType,
            document: body,
            transactionId: transactionId || transitionHeader || undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let doc = ctx.input.document || {};

      return {
        type: `document.${ctx.input.eventType}`,
        id: `${ctx.input.transactionId || ctx.input.documentId}-${ctx.input.eventType}`,
        output: {
          documentId: ctx.input.documentId,
          documentType: ctx.input.documentType || doc._type,
          revision: doc._rev,
          title: doc.title || doc.name,
          createdAt: doc._createdAt,
          updatedAt: doc._updatedAt,
          document: doc
        }
      };
    }
  })
  .build();
