import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let recurringInvoiceEventTypes = [
  'recurring_sales_invoice_created',
  'recurring_sales_invoice_updated',
  'recurring_sales_invoice_destroyed',
  'recurring_sales_invoice_deactivated',
  'recurring_sales_invoice_invoice_created',
  'recurring_sales_invoice_started_auto_send',
  'recurring_sales_invoice_stopped_auto_send',
  'recurring_sales_invoice_auto_send_forcefully_disabled',
  'recurring_sales_invoice_reached_desired_count_of_invoices'
] as const;

export let recurringInvoiceEvents = SlateTrigger.create(spec, {
  name: 'Recurring Invoice Events',
  key: 'recurring_invoice_events',
  description:
    'Triggered on recurring sales invoice events: creation, updates, deletion, activation/deactivation, invoice generation, and auto-send changes.'
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
      recurringInvoiceId: z.string().describe('Recurring invoice ID'),
      contactId: z.string().nullable().describe('Contact ID'),
      active: z.boolean().nullable().describe('Whether recurrence is active'),
      frequency: z.number().nullable().describe('Recurrence frequency'),
      frequencyType: z.string().nullable().describe('Recurrence interval type'),
      autoSend: z.boolean().nullable().describe('Whether auto-send is enabled'),
      currency: z.string().nullable().describe('Currency code'),
      totalPriceInclTax: z.string().nullable().describe('Total price per invoice')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        ...recurringInvoiceEventTypes
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
          recurringInvoiceId: entity.id ? String(entity.id) : 'unknown',
          contactId: entity.contact_id ? String(entity.contact_id) : null,
          active: entity.active ?? null,
          frequency: entity.frequency ?? null,
          frequencyType: entity.frequency_type || null,
          autoSend: entity.auto_send ?? null,
          currency: entity.currency || null,
          totalPriceInclTax: entity.total_price_incl_tax || null
        }
      };
    }
  });
