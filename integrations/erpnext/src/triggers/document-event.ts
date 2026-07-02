import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentEvent = SlateTrigger.create(spec, {
  name: 'Document Event',
  key: 'document_event',
  description:
    'Triggers when an ERPNext document is created, updated, submitted, cancelled, deleted, or changed. Receives the full document payload via webhook.'
})
  .input(
    z.object({
      doctype: z.string().describe('The DocType that triggered the event'),
      eventType: z
        .string()
        .describe('The type of event (e.g., after_insert, on_update, on_submit)'),
      documentName: z.string().describe('The name/ID of the affected document'),
      documentData: z
        .record(z.string(), z.any())
        .describe('The document data from the webhook payload')
    })
  )
  .output(
    z.object({
      doctype: z.string().describe('The DocType of the affected document'),
      documentName: z.string().describe('The name/ID of the affected document'),
      documentData: z.record(z.string(), z.any()).describe('The full document data'),
      eventType: z.string().describe('The type of event that occurred'),
      modifiedAt: z.string().optional().describe('When the document was last modified'),
      modifiedBy: z.string().optional().describe('Who last modified the document'),
      owner: z.string().optional().describe('The document owner/creator')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        siteUrl: ctx.config.siteUrl,
        token: ctx.auth.token
      });

      let webhookDoc = await client.createWebhook({
        webhookDoctype: 'Comment',
        webhookDoctypeEvent: 'after_insert',
        requestUrl: ctx.input.webhookBaseUrl,
        requestStructure: 'JSON',
        enabled: true
      });

      return {
        registrationDetails: {
          webhookName: webhookDoc.name
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        siteUrl: ctx.config.siteUrl,
        token: ctx.auth.token
      });

      if (ctx.input.registrationDetails?.webhookName) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookName);
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) {
        return { inputs: [] };
      }

      let doctype = body.doctype || body.doc_type || '';
      let documentName = body.name || body.doc_name || '';
      let eventType = body.event || body.webhook_event || 'unknown';

      let documentData: Record<string, any> = {};
      if (typeof body === 'object') {
        documentData = { ...body };
      }

      return {
        inputs: [
          {
            doctype,
            eventType,
            documentName,
            documentData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventSuffix = ctx.input.eventType.replace(/^on_/, '').replace(/^after_/, '');

      let doctype = ctx.input.doctype.toLowerCase().replace(/\s+/g, '_');
      let type = `${doctype}.${eventSuffix}`;

      return {
        type,
        id: `${ctx.input.doctype}-${ctx.input.documentName}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          doctype: ctx.input.doctype,
          documentName: ctx.input.documentName,
          documentData: ctx.input.documentData,
          eventType: ctx.input.eventType,
          modifiedAt: (ctx.input.documentData.modified ||
            ctx.input.documentData.modification_date) as string | undefined,
          modifiedBy: ctx.input.documentData.modified_by as string | undefined,
          owner: ctx.input.documentData.owner as string | undefined
        }
      };
    }
  })
  .build();
