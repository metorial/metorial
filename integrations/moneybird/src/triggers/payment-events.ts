import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

let paymentEventTypes = [
  'payment_registered',
  'payment_destroyed',
  'payment_linked_to_financial_mutation',
  'payment_send_email',
  'send_payment_email',
  'send_payment_unsuccessful_email',
  'direct_debit_transaction_created',
  'direct_debit_transaction_deleted',
  'payment_transaction_authorized',
  'payment_transaction_awaiting_authorization',
  'payment_transaction_batch_cancelled',
  'payment_transaction_batch_created',
  'payment_transaction_executing',
  'payment_transaction_paid',
  'payment_transaction_pending',
  'payment_transaction_rejected'
] as const;

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggered on payment events: registration, deletion, linking to financial mutations, email notifications, direct debit transactions, and payment transaction lifecycle (authorized, executing, paid, rejected).'
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
      entityId: z.string().describe('Entity ID (payment, transaction, or batch)'),
      entityType: z.string().nullable().describe('Type of entity'),
      invoiceId: z.string().nullable().describe('Related invoice ID'),
      amount: z.string().nullable().describe('Payment amount'),
      paymentDate: z.string().nullable().describe('Payment date'),
      financialMutationId: z.string().nullable().describe('Linked financial mutation ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.config.administrationId
      });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        ...paymentEventTypes
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
          entityId: entity.id ? String(entity.id) : 'unknown',
          entityType: entity.invoice_type || null,
          invoiceId: entity.invoice_id ? String(entity.invoice_id) : null,
          amount: entity.price || entity.amount || null,
          paymentDate: entity.payment_date || null,
          financialMutationId: entity.financial_mutation_id
            ? String(entity.financial_mutation_id)
            : null
        }
      };
    }
  });
