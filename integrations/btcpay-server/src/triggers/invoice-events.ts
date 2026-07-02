import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

export let invoiceEvents = SlateTrigger.create(spec, {
  name: 'Invoice Events',
  key: 'invoice_events',
  description:
    'Triggers when invoice status changes occur, including creation, payment, settlement, expiration, and invalidation.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('BTCPay Server event type (e.g., InvoiceCreated, InvoiceSettled)'),
      deliveryId: z.string().describe('Webhook delivery ID'),
      invoiceId: z.string().describe('Invoice ID'),
      storeId: z.string().describe('Store ID'),
      timestamp: z.number().optional().describe('Event timestamp'),
      partiallyPaid: z
        .boolean()
        .optional()
        .describe('Whether the invoice was partially paid (for expired events)'),
      overPaid: z.boolean().optional().describe('Whether the invoice was overpaid'),
      manuallyMarked: z
        .boolean()
        .optional()
        .describe('Whether the status was manually marked'),
      paymentMethodId: z
        .string()
        .optional()
        .nullable()
        .describe('Payment method ID (for payment events)'),
      paymentValue: z
        .string()
        .optional()
        .nullable()
        .describe('Payment value (for payment events)')
    })
  )
  .output(
    z.object({
      invoiceId: z.string().describe('Invoice ID'),
      storeId: z.string().describe('Store ID'),
      status: z.string().describe('Invoice status derived from event type'),
      partiallyPaid: z.boolean().optional().describe('Whether the invoice was partially paid'),
      overPaid: z.boolean().optional().describe('Whether the invoice was overpaid'),
      manuallyMarked: z.boolean().optional().describe('Whether status was manually set'),
      paymentMethodId: z.string().optional().nullable().describe('Payment method used'),
      paymentValue: z.string().optional().nullable().describe('Payment amount received'),
      timestamp: z.number().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BTCPayClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let stores = await client.getStores();

      let registrations: Array<{ storeId: string; webhookId: string; secret: string }> = [];

      for (let store of stores) {
        let storeId = store.id as string;
        let result = await client.createWebhook(storeId, {
          url: ctx.input.webhookBaseUrl,
          enabled: true,
          authorizedEvents: {
            everything: false,
            specificEvents: [
              'InvoiceCreated',
              'InvoiceReceivedPayment',
              'InvoiceProcessing',
              'InvoiceExpired',
              'InvoiceSettled',
              'InvoiceInvalid',
              'InvoicePaymentSettled'
            ]
          }
        });

        registrations.push({
          storeId,
          webhookId: result.id as string,
          secret: result.secret as string
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BTCPayClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let registrations = (ctx.input.registrationDetails as Record<string, unknown>)
        .registrations as Array<{ storeId: string; webhookId: string }>;

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.storeId, reg.webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      if (!body?.type) {
        return { inputs: [] };
      }

      let eventType = body.type as string;

      // Only process invoice events
      if (!eventType.startsWith('Invoice')) {
        return { inputs: [] };
      }

      let deliveryId =
        (body.deliveryId as string) ||
        (body.webhookId as string) ||
        `${body.invoiceId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            deliveryId: String(deliveryId),
            invoiceId: (body.invoiceId as string) || '',
            storeId: (body.storeId as string) || '',
            timestamp: body.timestamp as number | undefined,
            partiallyPaid: body.partiallyPaid as boolean | undefined,
            overPaid: body.overPaid as boolean | undefined,
            manuallyMarked: body.manuallyMarked as boolean | undefined,
            paymentMethodId: (body.paymentMethodId as string) || null,
            paymentValue: ((body.payment as Record<string, unknown>)?.value as string) || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let statusMap: Record<string, string> = {
        InvoiceCreated: 'New',
        InvoiceReceivedPayment: 'Processing',
        InvoiceProcessing: 'Processing',
        InvoiceExpired: 'Expired',
        InvoiceSettled: 'Settled',
        InvoiceInvalid: 'Invalid',
        InvoicePaymentSettled: 'Settled'
      };

      let status = statusMap[ctx.input.eventType] || ctx.input.eventType;
      let typeKey = ctx.input.eventType
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      return {
        type: `invoice.${typeKey}`,
        id: ctx.input.deliveryId,
        output: {
          invoiceId: ctx.input.invoiceId,
          storeId: ctx.input.storeId,
          status,
          partiallyPaid: ctx.input.partiallyPaid,
          overPaid: ctx.input.overPaid,
          manuallyMarked: ctx.input.manuallyMarked,
          paymentMethodId: ctx.input.paymentMethodId,
          paymentValue: ctx.input.paymentValue,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
