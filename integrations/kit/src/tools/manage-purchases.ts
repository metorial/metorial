import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePurchases = SlateTool.create(spec, {
  name: 'Manage Purchases',
  key: 'manage_purchases',
  description: `List, get, and create purchase records. Purchases link e-commerce transactions to subscribers for purchase-based automations and segmentation.`,
  instructions: [
    'Purchase creation requires OAuth authentication and is not available via API key.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create']).describe('The operation to perform'),
      purchaseId: z.number().optional().describe('Purchase ID (required for get)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Subscriber email address (required for create)'),
      transactionId: z
        .string()
        .optional()
        .describe('Unique transaction ID (required for create)'),
      currency: z.string().optional().describe('Currency code, e.g. USD (for create)'),
      transactionTime: z
        .string()
        .optional()
        .describe('ISO 8601 transaction timestamp (for create)'),
      subtotal: z.number().optional().describe('Subtotal in cents (for create)'),
      tax: z.number().optional().describe('Tax amount in cents (for create)'),
      discount: z.number().optional().describe('Discount amount in cents (for create)'),
      total: z.number().optional().describe('Total amount in cents (for create)'),
      status: z.string().optional().describe('Transaction status, e.g. paid (for create)'),
      products: z
        .array(
          z.object({
            name: z.string().describe('Product name'),
            sku: z.string().optional().describe('Product SKU'),
            pid: z.number().describe('Product ID'),
            lid: z.number().describe('Product line ID'),
            unitPrice: z.number().describe('Unit price in cents'),
            quantity: z.number().describe('Quantity purchased')
          })
        )
        .optional()
        .describe('Products in the purchase (required for create)')
    })
  )
  .output(
    z.object({
      purchases: z
        .array(
          z.object({
            purchaseId: z.number().describe('Unique purchase ID'),
            transactionId: z.string().describe('Transaction ID'),
            emailAddress: z.string().describe('Subscriber email'),
            currency: z.string().describe('Currency code'),
            total: z.number().describe('Total amount'),
            status: z.string().describe('Transaction status'),
            transactionTime: z.string().describe('When the transaction occurred')
          })
        )
        .optional()
        .describe('List of purchases'),
      purchase: z
        .object({
          purchaseId: z.number().describe('Unique purchase ID'),
          transactionId: z.string().describe('Transaction ID'),
          emailAddress: z.string().describe('Subscriber email'),
          currency: z.string().describe('Currency code'),
          total: z.number().describe('Total amount'),
          status: z.string().describe('Transaction status'),
          transactionTime: z.string().describe('When the transaction occurred')
        })
        .optional()
        .describe('Single purchase')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapPurchase = (p: any) => ({
      purchaseId: p.id,
      transactionId: p.transaction_id,
      emailAddress: p.email_address,
      currency: p.currency,
      total: p.total,
      status: p.status,
      transactionTime: p.transaction_time
    });

    if (ctx.input.action === 'list') {
      let result = await client.listPurchases();
      let purchases = result.data.map(mapPurchase);
      return {
        output: { purchases },
        message: `Found **${purchases.length}** purchases.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.purchaseId) throw new Error('Purchase ID is required for get');
      let data = await client.getPurchase(ctx.input.purchaseId);
      return {
        output: { purchase: mapPurchase(data.purchase) },
        message: `Retrieved purchase \`${data.purchase.transaction_id}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.emailAddress) throw new Error('Email address is required for create');
      if (!ctx.input.transactionId) throw new Error('Transaction ID is required for create');
      if (!ctx.input.products || ctx.input.products.length === 0)
        throw new Error('At least one product is required for create');

      let data = await client.createPurchase({
        emailAddress: ctx.input.emailAddress,
        transactionId: ctx.input.transactionId,
        currency: ctx.input.currency,
        transactionTime: ctx.input.transactionTime,
        subtotal: ctx.input.subtotal,
        tax: ctx.input.tax,
        discount: ctx.input.discount,
        total: ctx.input.total,
        status: ctx.input.status,
        products: ctx.input.products
      });
      return {
        output: { purchase: mapPurchase(data.purchase) },
        message: `Created purchase \`${data.purchase.transaction_id}\` for **${data.purchase.email_address}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
