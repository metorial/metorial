import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentEvent = SlateTrigger.create(spec, {
  name: 'Document Event',
  key: 'document_event',
  description:
    'Triggers when a document is parsed, fails to parse, or is received in a Parsio.io mailbox. Supports all document-level webhook events.'
})
  .input(
    z.object({
      event: z
        .string()
        .describe(
          'The event type (e.g. doc.parsed, doc.fail, doc.received, doc.parsed.flat, table.parsed)'
        ),
      documentId: z
        .string()
        .optional()
        .describe('ID of the document that triggered the event'),
      mailboxId: z.string().optional().describe('ID of the mailbox the document belongs to'),
      parsedData: z.any().optional().describe('Parsed/extracted data from the document'),
      rawPayload: z.record(z.string(), z.any()).optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      documentId: z.string().optional().describe('ID of the document'),
      mailboxId: z.string().optional().describe('ID of the mailbox'),
      event: z.string().describe('The event type that occurred'),
      parsedData: z.any().optional().describe('Structured data extracted from the document'),
      documentName: z.string().optional().describe('Name or subject of the document'),
      senderEmail: z.string().optional().describe('Sender email address if available'),
      receivedAt: z.string().optional().describe('When the document was received')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // We need a mailboxId to register a webhook - store it in registrationDetails
      // The webhook URL is provided by the platform
      // We'll register webhooks for all common events on the provided URL
      // Users will need to configure which mailbox to watch

      // For auto-registration, we need to know the mailbox
      // Since the spec says webhooks are scoped to a mailbox, we register for all mailboxes
      let mailboxes = await client.listMailboxes();
      let registeredWebhooks: Array<{ webhookId: string; mailboxId: string; event: string }> =
        [];

      let events = ['doc.parsed', 'doc.fail', 'doc.received'];

      for (let mb of mailboxes) {
        let mailboxId = mb._id || mb.id;
        for (let event of events) {
          try {
            let wh = await client.createWebhook({
              mailboxId,
              url: ctx.input.webhookBaseUrl,
              event
            });
            registeredWebhooks.push({
              webhookId: wh._id || wh.id,
              mailboxId,
              event
            });
          } catch {
            // Skip if webhook creation fails for a specific mailbox/event
          }
        }
      }

      return {
        registrationDetails: {
          webhooks: registeredWebhooks
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhooks = ctx.input.registrationDetails?.webhooks || [];
      let webhookIds = webhooks.map((wh: any) => wh.webhookId).filter(Boolean);

      if (webhookIds.length > 0) {
        try {
          await client.deleteWebhooks(webhookIds);
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data) {
        return { inputs: [] };
      }

      // Parsio webhook payloads include parsed data directly
      // The event type may be indicated in the payload or headers
      let documentId = data._id || data.id || data.doc_id;
      let mailboxId = data.mailbox_id || data.mb || data.mailboxId;
      let event = data.__event || data.event || 'doc.parsed';

      return {
        inputs: [
          {
            event,
            documentId,
            mailboxId,
            parsedData: data,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event || 'doc.parsed';
      let documentId = ctx.input.documentId || 'unknown';
      let rawPayload = ctx.input.rawPayload || {};

      return {
        type: eventType.replace(/\./g, '.'),
        id: documentId || `${eventType}-${Date.now()}`,
        output: {
          documentId: ctx.input.documentId,
          mailboxId: ctx.input.mailboxId,
          event: eventType,
          parsedData: ctx.input.parsedData,
          documentName:
            (rawPayload.name as string) || (rawPayload.subject as string) || undefined,
          senderEmail: (rawPayload.from as string) || undefined,
          receivedAt:
            (rawPayload.created_at as string) || (rawPayload.createdAt as string) || undefined
        }
      };
    }
  })
  .build();
