import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapReceipt, receiptSchema } from '../lib/receipts';
import { spec } from '../spec';

export let createRefund = SlateTool.create(spec, {
  name: 'Create Refund',
  key: 'create_refund',
  description: `Create a refund receipt for line items of an existing sales receipt. Refunded items are automatically restocked. Identify each line by its line item ID from Get Receipt, or by variant ID when the variant appears on only one line of the sale.`,
  instructions: [
    'Use Get Receipt to find the lineItemId values of the original sale.',
    'Refund amounts are based on the original sale; prices cannot be overridden.'
  ],
  constraints: [
    'Only receipts paid with a single payment can be refunded.',
    'Receipts paid via integrated payments (SumUp, iZettle, etc.) must be refunded through the POS app.',
    'A successful refund will automatically restock the refunded items.'
  ]
})
  .input(
    z.object({
      receiptNumber: z.string().describe('Receipt number of the original sale to refund'),
      lineItems: z
        .array(
          z.object({
            lineItemId: z
              .string()
              .optional()
              .describe('Line item ID from the original sales receipt (preferred)'),
            variantId: z
              .string()
              .optional()
              .describe(
                'Variant ID to refund; used to find the line item when lineItemId is omitted'
              ),
            quantity: z.number().describe('Quantity to refund'),
            price: z
              .number()
              .optional()
              .describe(
                'Not supported by Loyverse and ignored: refunds always use the original sale price'
              )
          })
        )
        .min(1)
        .describe('Items to refund'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID for the refund; defaults to the store of the sales receipt'),
      employeeId: z.string().optional().describe('Employee ID associated with the refund'),
      receiptDate: z
        .string()
        .optional()
        .describe('Refund date in ISO 8601 UTC format; defaults to now'),
      source: z.string().optional().describe('Source name for the refund receipt')
    })
  )
  .output(receiptSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let priceIgnored = ctx.input.lineItems.some(li => li.price !== undefined);

    let saleLines: any[] | undefined;
    let lineItems: { id: string; quantity: number }[] = [];

    for (let li of ctx.input.lineItems) {
      if (li.lineItemId) {
        lineItems.push({ id: li.lineItemId, quantity: li.quantity });
        continue;
      }

      if (!li.variantId) {
        throw createApiServiceError(
          'Each refund line item needs a lineItemId (from Get Receipt) or a variantId.',
          { reason: 'invalid_input' }
        );
      }

      if (!saleLines) {
        let sale = await client.getReceipt(ctx.input.receiptNumber);
        saleLines = sale.line_items ?? [];
      }

      let matches = (saleLines ?? []).filter((line: any) => line.variant_id === li.variantId);
      if (matches.length !== 1) {
        throw createApiServiceError(
          matches.length === 0
            ? `Variant ${li.variantId} is not on receipt ${ctx.input.receiptNumber}.`
            : `Variant ${li.variantId} appears on several lines of receipt ${ctx.input.receiptNumber}; pass lineItemId instead.`,
          { reason: 'invalid_input' }
        );
      }

      lineItems.push({ id: matches[0].id, quantity: li.quantity });
    }

    let body: any = { line_items: lineItems };
    if (ctx.input.storeId) body.store_id = ctx.input.storeId;
    if (ctx.input.employeeId) body.employee_id = ctx.input.employeeId;
    if (ctx.input.receiptDate) body.receipt_date = ctx.input.receiptDate;
    if (ctx.input.source) body.source = ctx.input.source;

    let result = await client.createRefund(ctx.input.receiptNumber, body);

    return {
      output: mapReceipt(result),
      message: `Created refund receipt **${result.receipt_number}** for original receipt **${ctx.input.receiptNumber}**.${priceIgnored ? ' Price overrides were ignored; refunds use the original sale price.' : ''}`
    };
  })
  .build();
