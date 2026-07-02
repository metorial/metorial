import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRefund = SlateTool.create(spec, {
  name: 'Create Refund',
  key: 'create_refund',
  description: `Initiate a full or partial refund for a completed transaction. Provide the transaction ID and optionally an amount for partial refunds. If no amount is specified, a full refund is processed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      transactionId: z.number().describe('Flutterwave transaction ID to refund'),
      amount: z.number().optional().describe('Amount to refund (omit for full refund)'),
      comments: z.string().optional().describe('Reason for the refund')
    })
  )
  .output(
    z.object({
      refundId: z.number().describe('Refund ID'),
      transactionId: z.number().describe('Original transaction ID'),
      amountRefunded: z.number().describe('Amount refunded'),
      status: z.string().describe('Refund status'),
      destination: z.string().optional().describe('Refund destination (card, wallet, etc.)'),
      createdAt: z.string().optional().describe('Refund creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createRefund(ctx.input.transactionId, {
      amount: ctx.input.amount,
      comments: ctx.input.comments
    });

    let r = result.data;

    return {
      output: {
        refundId: r.id,
        transactionId: r.tx_id,
        amountRefunded: r.amount_refunded,
        status: r.status,
        destination: r.destination,
        createdAt: r.created_at
      },
      message: `Refund of **${r.amount_refunded}** initiated for transaction ${r.tx_id}. Status: **${r.status}**.`
    };
  })
  .build();
