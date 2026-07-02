import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let createRefund = SlateTool.create(spec, {
  name: 'Request Label Refund',
  key: 'create_refund',
  description: `Request a refund for an unused shipping label. You must explicitly request refunds — unused labels are not automatically refunded. Provide the transaction (label) ID to refund.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Transaction (label) ID to refund')
    })
  )
  .output(
    z.object({
      refundId: z.string().describe('Unique refund identifier'),
      status: z
        .string()
        .optional()
        .describe('Refund status (QUEUED, PENDING, SUCCESS, ERROR)'),
      transactionId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.createRefund({
      transaction: ctx.input.transactionId
    })) as Record<string, any>;

    return {
      output: {
        refundId: result.object_id,
        status: result.status,
        transactionId: result.transaction
      },
      message: `Refund ${result.status === 'SUCCESS' ? '✅ processed' : `status: ${result.status}`} for transaction ${ctx.input.transactionId} (refund: ${result.object_id}).`
    };
  })
  .build();
