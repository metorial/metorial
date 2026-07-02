import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSale = SlateTool.create(spec, {
  name: 'Manage Sale',
  key: 'manage_sale',
  description: `Mark a sale as shipped, refund a sale, or resend the purchase receipt. Supports partial refunds by specifying an amount in cents.`,
  instructions: [
    'Use "mark_as_shipped" to mark a physical product sale as shipped, optionally providing a tracking URL.',
    'Use "refund" to process a full or partial refund. Omit amountCents for a full refund.',
    'Use "resend_receipt" to email the purchase receipt to the customer again.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['mark_as_shipped', 'refund', 'resend_receipt'])
        .describe('Action to perform on the sale'),
      saleId: z.string().describe('The sale ID to manage'),
      trackingUrl: z
        .string()
        .optional()
        .describe('Shipment tracking URL (for mark_as_shipped)'),
      amountCents: z
        .number()
        .optional()
        .describe('Refund amount in cents. Omit for full refund. (for refund)')
    })
  )
  .output(
    z.object({
      saleId: z.string().describe('The managed sale ID'),
      productName: z.string().optional().describe('Product name'),
      refunded: z.boolean().optional().describe('Whether the sale is refunded'),
      shipped: z.boolean().optional().describe('Whether the sale is marked as shipped'),
      receiptResent: z.boolean().optional().describe('Whether the receipt was resent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { action, saleId } = ctx.input;

    if (action === 'mark_as_shipped') {
      let sale = await client.markSaleAsShipped(saleId, ctx.input.trackingUrl);
      return {
        output: {
          saleId: sale.id || saleId,
          productName: sale.product_name || undefined,
          shipped: true,
          refunded: sale.refunded
        },
        message: `Marked sale **${saleId}** as shipped.${ctx.input.trackingUrl ? ` Tracking: ${ctx.input.trackingUrl}` : ''}`
      };
    }

    if (action === 'refund') {
      let sale = await client.refundSale(saleId, ctx.input.amountCents);
      return {
        output: {
          saleId: sale.id || saleId,
          productName: sale.product_name || undefined,
          refunded: true,
          shipped: sale.shipped
        },
        message: `Refunded sale **${saleId}**.${ctx.input.amountCents ? ` Amount: ${ctx.input.amountCents} cents.` : ' Full refund.'}`
      };
    }

    if (action === 'resend_receipt') {
      await client.resendReceipt(saleId);
      return {
        output: {
          saleId,
          receiptResent: true
        },
        message: `Resent receipt for sale **${saleId}**.`
      };
    }

    throw gumroadServiceError(`Unknown action: ${action}`);
  })
  .build();
