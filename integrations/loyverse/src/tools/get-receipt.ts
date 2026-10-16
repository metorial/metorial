import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapReceipt, receiptSchema } from '../lib/receipts';
import { spec } from '../spec';

export let getReceipt = SlateTool.create(spec, {
  name: 'Get Receipt',
  key: 'get_receipt',
  description: `Retrieve a single sales or refund receipt by its receipt number, including full line items (with line item IDs needed for refunds), payment details, taxes, discounts, and modifiers.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      receiptNumber: z.string().describe('The receipt number to retrieve (e.g., "2-1008")')
    })
  )
  .output(receiptSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let r = await client.getReceipt(ctx.input.receiptNumber);

    return {
      output: mapReceipt(r),
      message: `Retrieved receipt **${r.receipt_number}**${r.receipt_type ? ` (${r.receipt_type})` : ''}${r.total_money !== undefined ? ` for **${r.total_money}**` : ''}.`
    };
  })
  .build();
