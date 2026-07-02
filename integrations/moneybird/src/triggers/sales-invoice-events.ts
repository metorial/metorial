import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let salesInvoiceEventTypes = [
  'sales_invoice_created',
  'sales_invoice_updated',
  'sales_invoice_destroyed',
  'sales_invoice_state_changed_to_draft',
  'sales_invoice_state_changed_to_open',
  'sales_invoice_state_changed_to_scheduled',
  'sales_invoice_state_changed_to_pending_payment',
  'sales_invoice_state_changed_to_reminded',
  'sales_invoice_state_changed_to_late',
  'sales_invoice_state_changed_to_paid',
  'sales_invoice_state_changed_to_uncollectible',
  'sales_invoice_send_email',
  'sales_invoice_send_manually',
  'sales_invoice_send_post',
  'sales_invoice_send_si',
  'sales_invoice_marked_as_dubious',
  'sales_invoice_marked_as_uncollectible',
  'sales_invoice_paused',
  'sales_invoice_unpaused',
  'sales_invoice_merged',
  'sales_invoice_created_based_on_estimate',
  'sales_invoice_created_based_on_recurring',
  'sales_invoice_created_based_on_subscription',
  'credit_invoice_created_from_original'
] as const;

export let salesInvoiceEvents = SlateTrigger.create(spec, {
  name: 'Sales Invoice Events',
  key: 'sales_invoice_events',
  description:
    'Triggered on sales invoice lifecycle events: creation, updates, deletion, state changes (draft, open, paid, late, reminded, uncollectible), sending, reminders, credit notes, and pause/resume.'
})
  .input(
    z.object({
      eventType: z.string().describe('Moneybird event type'),
      webhookToken: z.string().optional(),
      entity: z.any().describe('Full invoice entity data'),
      state: z.string().optional().describe('New state'),
      administrationId: z.string().optional()
    })
  )
  .output(
    z.object({
      salesInvoiceId: z.string().describe('Sales invoice ID'),
      invoiceNumber: z.string().nullable().describe('Human-readable invoice number'),
      contactId: z.string().nullable().describe('Contact ID'),
      invoiceState: z.string().nullable().describe('Current invoice state'),
      totalPriceInclTax: z.string().nullable().describe('Total including tax'),
      totalUnpaid: z.string().nullable().describe('Unpaid amount'),
      currency: z.string().nullable().describe('Currency code'),
      invoiceDate: z.string().nullable().describe('Invoice date'),
      dueDate: z.string().nullable().describe('Due date'),
      paused: z.boolean().nullable().describe('Whether the invoice workflow is paused'),
      url: z.string().nullable().describe('Invoice URL')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        ...salesInvoiceEventTypes
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
          salesInvoiceId: entity.id ? String(entity.id) : 'unknown',
          invoiceNumber: entity.invoice_id || null,
          contactId: entity.contact_id ? String(entity.contact_id) : null,
          invoiceState: ctx.input.state || entity.state || null,
          totalPriceInclTax: entity.total_price_incl_tax || null,
          totalUnpaid: entity.total_unpaid || null,
          currency: entity.currency || null,
          invoiceDate: entity.invoice_date || null,
          dueDate: entity.due_date || null,
          paused: entity.paused ?? null,
          url: entity.url || null
        }
      };
    }
  });
