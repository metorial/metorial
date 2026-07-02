import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

let documentWebhookEvents = [
  'document_state_changed',
  'recipient_completed',
  'document_updated',
  'document_deleted',
  'document_creation_failed',
  'document_completed_pdf_ready',
  'document_section_added',
  'quote_updated'
];

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggers when document-related events occur, including status changes, recipient completions, document deletions, PDF readiness, section additions, and quote updates.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the webhook event'),
      documentId: z.string().describe('UUID of the affected document'),
      documentName: z.string().optional().describe('Name of the document'),
      status: z.string().optional().describe('Document status'),
      dateCreated: z.string().optional().describe('Document creation date'),
      dateModified: z.string().optional().describe('Document last modified date'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional(),
            email: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            recipientType: z.string().optional(),
            hasCompleted: z.boolean().optional()
          })
        )
        .optional()
        .describe('Document recipients'),
      metadata: z.record(z.string(), z.any()).optional().describe('Document metadata'),
      tags: z.array(z.string()).optional().describe('Document tags'),
      createdBy: z
        .object({
          userId: z.string().optional(),
          email: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional()
        })
        .optional()
        .describe('User who created the document'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('UUID of the affected document'),
      documentName: z.string().optional().describe('Document name'),
      status: z.string().optional().describe('Current document status'),
      dateCreated: z.string().optional().describe('Document creation date'),
      dateModified: z.string().optional().describe('Document last modified date'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional(),
            email: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            recipientType: z.string().optional(),
            hasCompleted: z.boolean().optional()
          })
        )
        .optional()
        .describe('Document recipients'),
      metadata: z.record(z.string(), z.any()).optional().describe('Document metadata'),
      tags: z.array(z.string()).optional().describe('Document tags'),
      createdBy: z
        .object({
          userId: z.string().optional(),
          email: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional()
        })
        .optional()
        .describe('User who created the document')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PandaDocClient({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      let subscription = await client.createWebhookSubscription({
        name: 'Slates Document Events',
        url: ctx.input.webhookBaseUrl,
        active: true,
        triggers: documentWebhookEvents,
        payload: ['fields', 'products']
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.uuid || subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PandaDocClient({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = await ctx.request.json();

      // PandaDoc sends webhooks as an array of events
      let events: any[] = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => {
        let data = event.data || event;
        let recipients = (data.recipients || []).map((r: any) => ({
          recipientId: r.id,
          email: r.email,
          firstName: r.first_name,
          lastName: r.last_name,
          recipientType: r.recipient_type,
          hasCompleted: r.has_completed
        }));

        return {
          eventType: event.event || 'unknown',
          documentId: data.id || '',
          documentName: data.name,
          status: data.status,
          dateCreated: data.date_created,
          dateModified: data.date_modified,
          recipients,
          metadata: data.metadata,
          tags: data.tags,
          createdBy: data.created_by
            ? {
                userId: data.created_by.id,
                email: data.created_by.email,
                firstName: data.created_by.first_name,
                lastName: data.created_by.last_name
              }
            : undefined,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        document_state_changed: 'document.state_changed',
        recipient_completed: 'document.recipient_completed',
        document_updated: 'document.updated',
        document_deleted: 'document.deleted',
        document_creation_failed: 'document.creation_failed',
        document_completed_pdf_ready: 'document.pdf_ready',
        document_section_added: 'document.section_added',
        quote_updated: 'document.quote_updated'
      };

      let type = eventTypeMap[ctx.input.eventType] || `document.${ctx.input.eventType}`;

      // Build a unique ID from the event data
      let uniqueId = `${ctx.input.eventType}_${ctx.input.documentId}_${ctx.input.dateModified || Date.now()}`;

      return {
        type,
        id: uniqueId,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          status: ctx.input.status,
          dateCreated: ctx.input.dateCreated,
          dateModified: ctx.input.dateModified,
          recipients: ctx.input.recipients,
          metadata: ctx.input.metadata,
          tags: ctx.input.tags,
          createdBy: ctx.input.createdBy
        }
      };
    }
  })
  .build();
