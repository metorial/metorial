import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentEvent = SlateTrigger.create(spec, {
  name: 'Document Event',
  key: 'document_event',
  description:
    'Triggers when a document is processed, when processing fails, or when an export fails in a Parseur mailbox. Supports multiple event types through webhook configuration.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The webhook event type (e.g. document.processed, document.template_needed, document.export_failed)'
        ),
      documentId: z.string().describe('Unique document identifier'),
      mailboxId: z.string().describe('Mailbox ID the document belongs to'),
      parsedData: z
        .record(z.string(), z.any())
        .describe('The full webhook payload including parsed fields')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document identifier'),
      mailboxId: z.string().describe('Mailbox this document belongs to'),
      fileName: z.string().nullable().describe('Original file name'),
      status: z.string().nullable().describe('Document processing status'),
      parsedFields: z.record(z.string(), z.any()).describe('Extracted/parsed data fields')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // Create webhooks for the main event types
      let events = [
        'document.processed',
        'document.template_needed',
        'document.export_failed'
      ];

      let webhookIds: number[] = [];
      for (let event of events) {
        let webhook = await client.createWebhook({
          event,
          target: ctx.input.webhookBaseUrl,
          name: `Slates - ${event}`,
          category: 'CUSTOM'
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: {
          webhookIds
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let { webhookIds } = ctx.input.registrationDetails as { webhookIds: number[] };

      for (let webhookId of webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      // Parseur webhook payload contains the parsed fields directly
      // It includes a DocumentID field and other metadata
      let documentId = String(data.DocumentID || data.id || '');
      let mailboxId = String(data.parser || data.mailbox_id || '');

      // Determine event type from the payload
      // The event type depends on which webhook triggered this
      let eventType = 'document.processed';
      if (data.error || data.export_error) {
        eventType = data.export_error ? 'document.export_failed' : 'document.template_needed';
      }

      return {
        inputs: [
          {
            eventType,
            documentId,
            mailboxId,
            parsedData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, documentId, mailboxId, parsedData } = ctx.input;

      // Extract known metadata fields, everything else is parsed data
      let fileName = parsedData.OriginalDocument?.name || parsedData.file_name || null;
      let status = parsedData.status || null;

      // Remove internal metadata from parsed fields to keep them clean
      let parsedFields: Record<string, any> = {};
      for (let [key, value] of Object.entries(parsedData)) {
        if (
          !['DocumentID', 'id', 'parser', 'mailbox_id', 'status', 'file_name'].includes(key)
        ) {
          parsedFields[key] = value;
        }
      }

      return {
        type: eventType,
        id: documentId || `${mailboxId}-${Date.now()}`,
        output: {
          documentId,
          mailboxId,
          fileName,
          status,
          parsedFields
        }
      };
    }
  })
  .build();
