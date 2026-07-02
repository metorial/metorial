import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import type { Purchase } from '../lib/types';
import { spec } from '../spec';

let formatPurchase = (purchase: Purchase) => ({
  purchaseId: purchase.id,
  transactionId: purchase.transaction_id,
  subscriberId: purchase.subscriber_id,
  status: purchase.status,
  emailAddress: purchase.email_address,
  currency: purchase.currency,
  subtotal: purchase.subtotal,
  discount: purchase.discount,
  tax: purchase.tax,
  shipping: purchase.shipping,
  total: purchase.total,
  transactionTime: purchase.transaction_time,
  products: purchase.products.map(product => ({
    productName: product.name,
    productId: product.pid,
    lineItemId: product.lid,
    quantity: product.quantity,
    unitPrice: product.unit_price,
    sku: product.sku
  }))
});

export let managePurchases = SlateTool.create(spec, {
  name: 'Manage Purchases',
  key: 'manage_purchases',
  description:
    'List or retrieve Kit purchase records imported into the account. Use Create Purchase to import a new purchase.',
  instructions: [
    'Use action "list" to retrieve recent purchases.',
    'Use action "get" with purchaseId to retrieve one purchase record.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Action to perform'),
      purchaseId: z.number().optional().describe('Purchase ID (required for get)'),
      perPage: z.number().optional().describe('Results per page for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      purchases: z
        .array(
          z.object({
            purchaseId: z.number(),
            transactionId: z.string(),
            subscriberId: z.number().optional(),
            status: z.string(),
            emailAddress: z.string(),
            currency: z.string(),
            subtotal: z.number(),
            discount: z.number(),
            tax: z.number(),
            shipping: z.number(),
            total: z.number(),
            transactionTime: z.string(),
            products: z.array(
              z.object({
                productName: z.string(),
                productId: z.string().nullable(),
                lineItemId: z.string().nullable(),
                quantity: z.number(),
                unitPrice: z.number(),
                sku: z.string().nullable()
              })
            )
          })
        )
        .optional()
        .describe('Purchase records for list action'),
      purchase: z
        .object({
          purchaseId: z.number(),
          transactionId: z.string(),
          subscriberId: z.number().optional(),
          status: z.string(),
          emailAddress: z.string(),
          currency: z.string(),
          subtotal: z.number(),
          discount: z.number(),
          tax: z.number(),
          shipping: z.number(),
          total: z.number(),
          transactionTime: z.string(),
          products: z.array(
            z.object({
              productName: z.string(),
              productId: z.string().nullable(),
              lineItemId: z.string().nullable(),
              quantity: z.number(),
              unitPrice: z.number(),
              sku: z.string().nullable()
            })
          )
        })
        .optional()
        .describe('Purchase record for get action'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    if (ctx.input.action === 'list') {
      let result = await client.listPurchases({
        perPage: ctx.input.perPage,
        after: ctx.input.cursor
      });
      let purchases = result.purchases.map(formatPurchase);
      return {
        output: {
          purchases,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${purchases.length}** purchase(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (!ctx.input.purchaseId) {
      throw kitServiceError('purchaseId is required for get');
    }

    let purchase = await client.getPurchase(ctx.input.purchaseId);
    return {
      output: {
        purchase: formatPurchase(purchase)
      },
      message: `Purchase **${purchase.transaction_id}** — ${purchase.currency} ${purchase.total}`
    };
  });
