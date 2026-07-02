import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let documentEventInputSchema = z.object({
  eventType: z.string().describe('Event type from Quaderno webhook'),
  eventId: z.string().describe('Unique event identifier'),
  documentData: z.any().describe('Full document payload from webhook')
});

let documentEventOutputSchema = z.object({
  documentId: z.string().optional().describe('Document ID'),
  documentType: z
    .string()
    .optional()
    .describe('Document type (invoice, credit, expense, estimate, receipt)'),
  number: z.string().optional().describe('Document number'),
  contactId: z.string().optional().describe('Contact ID'),
  contactName: z.string().optional().describe('Contact name'),
  currency: z.string().optional().describe('Currency code'),
  total: z.string().optional().describe('Total amount'),
  state: z.string().optional().describe('Document state'),
  issueDate: z.string().optional().describe('Issue date'),
  permalink: z.string().optional().describe('Public permalink')
});

let ALL_DOCUMENT_EVENTS = [
  'invoice.created',
  'invoice.updated',
  'credit.created',
  'credit.updated',
  'expense.created',
  'expense.updated',
  'expense.deleted',
  'receipt.created',
  'receipt.updated'
];

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggered when invoices, credit notes, expenses, or receipts are created, updated, or deleted in Quaderno.'
})
  .input(documentEventInputSchema)
  .output(documentEventOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events_types: ALL_DOCUMENT_EVENTS
      });

      return {
        registrationDetails: {
          webhookId: webhook.id?.toString()
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type || body.type || '';
      let data = body.data || body;

      let eventId = `${eventType}-${data.id || ''}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            documentData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.documentData;

      let eventParts = ctx.input.eventType.split('.');
      let documentType = eventParts[0] ?? 'unknown';

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          documentId: data.id?.toString(),
          documentType,
          number: data.number?.toString(),
          contactId: data.contact?.id?.toString() || data.contact_id?.toString(),
          contactName: data.contact?.full_name,
          currency: data.currency,
          total: data.total,
          state: data.state,
          issueDate: data.issue_date,
          permalink: data.permalink
        }
      };
    }
  })
  .build();
