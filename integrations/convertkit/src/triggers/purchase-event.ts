import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let purchaseEvent = SlateTrigger.create(spec, {
  name: 'Purchase Created',
  key: 'purchase_event',
  description: 'Fires when a new purchase record is created in Kit.'
})
  .input(
    z.object({
      purchaseId: z.number().describe('Purchase record ID'),
      transactionId: z.string().describe('Transaction ID'),
      status: z.string().describe('Transaction status'),
      emailAddress: z.string().describe('Buyer email address'),
      currency: z.string().describe('Currency code'),
      total: z.number().describe('Total transaction amount'),
      transactionTime: z.string().describe('Transaction timestamp'),
      products: z
        .array(
          z.object({
            productName: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            sku: z.string().optional()
          })
        )
        .describe('Products in the purchase')
    })
  )
  .output(
    z.object({
      purchaseId: z.number().describe('Kit purchase record ID'),
      transactionId: z.string().describe('Transaction ID'),
      status: z.string().describe('Transaction status'),
      emailAddress: z.string().describe('Buyer email address'),
      currency: z.string().describe('Currency code'),
      total: z.number().describe('Total transaction amount'),
      transactionTime: z.string().describe('Transaction timestamp'),
      products: z
        .array(
          z.object({
            productName: z.string(),
            quantity: z.number(),
            unitPrice: z.number(),
            sku: z.string().optional()
          })
        )
        .describe('Products in the purchase')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, {
        name: 'purchase.purchase_create'
      });

      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: number };

      try {
        await client.deleteWebhook(details.webhookId);
      } catch {
        // Webhook may already be deleted
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let purchase = body.purchase;

      if (!purchase) {
        return { inputs: [] };
      }

      let products = (purchase.products || []).map((p: any) => ({
        productName: p.name || '',
        quantity: p.quantity || 1,
        unitPrice: p.unit_price || 0,
        sku: p.sku
      }));

      return {
        inputs: [
          {
            purchaseId: purchase.id || 0,
            transactionId: purchase.transaction_id || '',
            status: purchase.status || 'paid',
            emailAddress: purchase.email_address || '',
            currency: purchase.currency || 'USD',
            total: purchase.total || 0,
            transactionTime: purchase.transaction_time || new Date().toISOString(),
            products
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'purchase.created',
        id: `purchase-created-${ctx.input.purchaseId}-${Date.now()}`,
        output: {
          purchaseId: ctx.input.purchaseId,
          transactionId: ctx.input.transactionId,
          status: ctx.input.status,
          emailAddress: ctx.input.emailAddress,
          currency: ctx.input.currency,
          total: ctx.input.total,
          transactionTime: ctx.input.transactionTime,
          products: ctx.input.products
        }
      };
    }
  });
