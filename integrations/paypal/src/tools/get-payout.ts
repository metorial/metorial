import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { paypalServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getPayout = SlateTool.create(spec, {
  name: 'Get Payout',
  key: 'get_payout',
  description: `Retrieve the status and details of a PayPal batch payout or individual payout item. Track whether payouts have been claimed by recipients.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      payoutBatchId: z
        .string()
        .optional()
        .describe('Payout batch ID to retrieve batch details'),
      payoutItemId: z
        .string()
        .optional()
        .describe('Individual payout item ID to retrieve item details')
    })
  )
  .output(
    z.object({
      payoutBatchId: z.string().optional().describe('Batch ID'),
      batchStatus: z.string().optional().describe('Batch status'),
      totalItems: z.number().optional().describe('Total items in batch'),
      totalAmount: z.string().optional().describe('Total payout amount'),
      currencyCode: z.string().optional().describe('Currency code'),
      items: z
        .array(
          z.object({
            payoutItemId: z.string().describe('Payout item ID'),
            transactionStatus: z.string().describe('Item transaction status'),
            receiver: z.string().optional().describe('Recipient identifier'),
            amount: z.string().optional().describe('Item amount')
          })
        )
        .optional()
        .describe('Payout items'),
      payoutItem: z.any().optional().describe('Individual payout item details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    if (ctx.input.payoutItemId) {
      let item = await client.getPayoutItem(ctx.input.payoutItemId);
      return {
        output: {
          payoutItem: item
        },
        message: `Payout item \`${ctx.input.payoutItemId}\` status: **${item.transaction_status}**.`
      };
    }

    if (!ctx.input.payoutBatchId) {
      throw paypalServiceError('Either payoutBatchId or payoutItemId must be provided');
    }

    let batch = await client.getPayoutBatch(ctx.input.payoutBatchId);
    let header = batch.batch_header || {};
    let items = (batch.items || []) as any[];

    return {
      output: {
        payoutBatchId: header.payout_batch_id,
        batchStatus: header.batch_status,
        totalItems: header.sender_batch_header?.total_items || items.length,
        totalAmount: header.amount?.value,
        currencyCode: header.amount?.currency,
        items: items.map((item: any) => ({
          payoutItemId: item.payout_item_id,
          transactionStatus: item.transaction_status,
          receiver: item.payout_item?.receiver,
          amount: item.payout_item?.amount?.value
        }))
      },
      message: `Payout batch \`${header.payout_batch_id}\` is **${header.batch_status}** with ${items.length} item(s).`
    };
  })
  .build();
