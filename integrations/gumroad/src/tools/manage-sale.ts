import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadServiceError } from '../lib/errors';
import { gumroadActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let mapSaleState = (sale: any, saleId: string) => ({
  saleId: sale?.id || saleId,
  productName: sale?.product_name || undefined,
  refunded: sale?.refunded ?? undefined,
  partiallyRefunded: sale?.partially_refunded ?? undefined,
  shipped: sale?.shipped ?? undefined,
  accessRevoked: sale?.access_revoked ?? undefined
});

export let manageSale = SlateTool.create(spec, {
  name: 'Manage Sale',
  key: 'manage_sale',
  description: `Mark a sale as shipped, refund a sale, revoke or restore the buyer's access, or resend the purchase receipt. Supports partial refunds by specifying an amount.`,
  instructions: [
    'Use "mark_as_shipped" to mark a physical product sale as shipped, optionally providing a tracking URL.',
    'Use "refund" to process a full or partial refund. Omit amountCents for a full refund. Multiple partial refunds are allowed until the sale is fully refunded.',
    'Use "revoke_access" to remove the buyer\'s access to the purchased content without refunding. Gumroad refuses this for refunded sales, physical products, and subscriptions, and requires the edit_sales permission.',
    'Use "restore_access" to give back access that was previously revoked.',
    'Use "resend_receipt" to email the purchase receipt to the customer again.'
  ],
  tags: {
    destructive: true
  }
})
  .scopes(gumroadActionScopes.manageSale)
  .input(
    z.object({
      action: z
        .enum([
          'mark_as_shipped',
          'refund',
          'resend_receipt',
          'revoke_access',
          'restore_access'
        ])
        .describe('Action to perform on the sale'),
      saleId: z.string().describe('The sale ID to manage'),
      trackingUrl: z
        .string()
        .optional()
        .describe('Full http:// or https:// shipment tracking URL (for mark_as_shipped)'),
      amountCents: z
        .number()
        .optional()
        .describe(
          "Refund amount in the minor units of the sale's currency (whole yen for JPY). Omit for a full refund. (for refund)"
        )
    })
  )
  .output(
    z.object({
      saleId: z.string().describe('The managed sale ID'),
      productName: z.string().optional().describe('Product name'),
      refunded: z.boolean().optional().describe('Whether the sale is fully refunded'),
      partiallyRefunded: z
        .boolean()
        .optional()
        .describe('Whether the sale is partially refunded'),
      shipped: z.boolean().optional().describe('Whether the sale is marked as shipped'),
      accessRevoked: z
        .boolean()
        .optional()
        .describe("Whether the buyer's access to the purchase is revoked"),
      receiptResent: z.boolean().optional().describe('Whether the receipt was resent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { action, saleId } = ctx.input;

    if (action === 'mark_as_shipped') {
      let sale = await client.markSaleAsShipped(saleId, ctx.input.trackingUrl);
      return {
        output: { ...mapSaleState(sale, saleId), shipped: sale?.shipped ?? true },
        message: `Marked sale **${saleId}** as shipped.${ctx.input.trackingUrl ? ` Tracking: ${ctx.input.trackingUrl}` : ''}`
      };
    }

    if (action === 'refund') {
      let sale = await client.refundSale(saleId, ctx.input.amountCents);
      let output = mapSaleState(sale, saleId);
      return {
        output,
        message: `Refunded sale **${saleId}**.${ctx.input.amountCents !== undefined ? ` Amount: ${ctx.input.amountCents} (minor currency units).` : ' Full refund.'}`
      };
    }

    if (action === 'revoke_access') {
      let sale = await client.revokeSaleAccess(saleId);
      return {
        output: mapSaleState(sale, saleId),
        message: `Revoked buyer access for sale **${saleId}**.`
      };
    }

    if (action === 'restore_access') {
      let sale = await client.undoRevokeSaleAccess(saleId);
      return {
        output: mapSaleState(sale, saleId),
        message: `Restored buyer access for sale **${saleId}**.`
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
