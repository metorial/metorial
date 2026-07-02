import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let recipientSchema = z.object({
  recipientId: z.number().describe('Unique identifier of the recipient'),
  email: z.string().describe('Recipient email address'),
  name: z.string().describe('Recipient display name'),
  role: z.string().describe('Recipient role'),
  signingStatus: z.string().describe('Current signing status'),
  signingOrder: z.number().optional().describe('Signing order')
});

export let documentEventTrigger = SlateTrigger.create(spec, {
  name: 'Document Event',
  key: 'document_event',
  description:
    'Triggers when a document lifecycle event occurs: created, sent, opened, signed, completed, rejected, or cancelled. Requires webhook configuration in Documenso team settings.',
  instructions: [
    'Configure the webhook URL in Documenso Team Settings > Webhooks.',
    'Select the events you want to subscribe to.',
    'Optionally set a secret for payload verification via the X-Documenso-Secret header.'
  ]
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The document event type (e.g. document.created, document.signed)'),
      documentId: z.string().describe('ID of the affected document'),
      title: z.string().describe('Title of the document'),
      status: z.string().describe('Current status of the document'),
      createdAt: z.string().describe('Timestamp of the event'),
      recipients: z.array(recipientSchema).optional().describe('Recipients of the document'),
      rejectionReason: z
        .string()
        .optional()
        .describe('Reason for rejection (for document.rejected events)')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the affected document'),
      title: z.string().describe('Title of the document'),
      status: z.string().describe('Current status of the document'),
      recipients: z.array(recipientSchema).optional().describe('Recipients of the document'),
      rejectionReason: z.string().optional().describe('Reason for rejection'),
      eventTimestamp: z.string().describe('Timestamp when the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let event = String(data.event ?? '').toLowerCase();
      let payload = (data.payload ?? data) as Record<string, unknown>;
      let documentId = String(payload.id ?? payload.documentId ?? '');
      let title = String(payload.title ?? '');
      let status = String(payload.status ?? '');
      let createdAt = String(data.createdAt ?? new Date().toISOString());

      let rawRecipients = (payload.recipients ?? []) as Record<string, unknown>[];
      let recipients = rawRecipients.map(r => ({
        recipientId: Number(r.id ?? r.recipientId ?? 0),
        email: String(r.email ?? ''),
        name: String(r.name ?? ''),
        role: String(r.role ?? ''),
        signingStatus: String(r.signingStatus ?? r.status ?? ''),
        signingOrder: r.signingOrder != null ? Number(r.signingOrder) : undefined
      }));

      let rejectionReason = payload.rejectionReason
        ? String(payload.rejectionReason)
        : undefined;

      // Normalize event name: DOCUMENT_COMPLETED -> document.completed
      if (event.includes('_')) {
        event = event.replace(/_/g, '.').toLowerCase();
      }

      return {
        inputs: [
          {
            eventType: event,
            documentId,
            title,
            status,
            createdAt,
            recipients: recipients.length > 0 ? recipients : undefined,
            rejectionReason
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.documentId}-${ctx.input.eventType}-${ctx.input.createdAt}`,
        output: {
          documentId: ctx.input.documentId,
          title: ctx.input.title,
          status: ctx.input.status,
          recipients: ctx.input.recipients,
          rejectionReason: ctx.input.rejectionReason,
          eventTimestamp: ctx.input.createdAt
        }
      };
    }
  })
  .build();
