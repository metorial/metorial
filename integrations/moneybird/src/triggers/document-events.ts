import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let documentEventTypes = [
  'document_saved',
  'document_updated',
  'document_destroyed',
  'document_expired',
  'document_recurred',
  'document_saved_from_email',
  'document_saved_from_si',
  'document_created_from_original',
  'external_sales_invoice_created',
  'external_sales_invoice_updated',
  'external_sales_invoice_destroyed',
  'external_sales_invoice_state_changed_to_open',
  'external_sales_invoice_state_changed_to_late',
  'external_sales_invoice_state_changed_to_paid',
  'external_sales_invoice_state_changed_to_uncollectible',
  'external_sales_invoice_marked_as_dubious',
  'external_sales_invoice_marked_as_uncollectible'
] as const;

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggered on document lifecycle events (purchase invoices, receipts, general documents) and external sales invoice events. Covers creation, updates, deletion, expiration, and state changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Moneybird event type'),
      webhookToken: z.string().optional(),
      entity: z.any().describe('Full entity data'),
      state: z.string().optional(),
      administrationId: z.string().optional()
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document or external invoice ID'),
      documentType: z.string().nullable().describe('Type of document'),
      contactId: z.string().nullable().describe('Contact ID'),
      documentState: z.string().nullable().describe('Current state'),
      totalPriceInclTax: z.string().nullable().describe('Total amount'),
      currency: z.string().nullable().describe('Currency code'),
      date: z.string().nullable().describe('Document date'),
      dueDate: z.string().nullable().describe('Due date'),
      reference: z.string().nullable().describe('Reference')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        ...documentEventTypes
      ]);

      return {
        registrationDetails: {
          webhookId: String(webhook.id),
          token: webhook.token
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.action || 'unknown',
            webhookToken: data.token,
            entity: data.entity,
            state: data.state,
            administrationId: data.administration_id
              ? String(data.administration_id)
              : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let entity = ctx.input.entity || {};
      let idempotencyKey = `${ctx.input.eventType}-${entity.id}-${Date.now()}`;

      return {
        type: ctx.input.eventType.replace(/_/g, '.'),
        id: idempotencyKey,
        output: {
          documentId: entity.id ? String(entity.id) : 'unknown',
          documentType: entity.type || null,
          contactId: entity.contact_id ? String(entity.contact_id) : null,
          documentState: ctx.input.state || entity.state || null,
          totalPriceInclTax: entity.total_price_incl_tax || null,
          currency: entity.currency || null,
          date: entity.date || entity.invoice_date || null,
          dueDate: entity.due_date || null,
          reference: entity.reference || null
        }
      };
    }
  });
