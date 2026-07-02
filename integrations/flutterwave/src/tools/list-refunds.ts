import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRefunds = SlateTool.create(spec, {
  name: 'List Refunds',
  key: 'list_refunds',
  description: `Retrieve a list of refunds or get details for a specific refund. Filter by date range and page through results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      refundId: z.number().optional().describe('Specific refund ID to retrieve'),
      page: z.number().optional().describe('Page number for pagination'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      refunds: z
        .array(
          z.object({
            refundId: z.number().describe('Refund ID'),
            transactionId: z.number().optional().describe('Original transaction ID'),
            flwRef: z.string().optional().describe('Flutterwave reference'),
            amountRefunded: z.number().describe('Amount refunded'),
            status: z.string().describe('Refund status'),
            destination: z.string().optional().describe('Refund destination'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            comment: z.string().optional().describe('Refund comment')
          })
        )
        .describe('List of refunds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.refundId) {
      let result = await client.getRefund(ctx.input.refundId);
      let r = result.data;
      return {
        output: {
          refunds: [
            {
              refundId: r.id,
              transactionId: r.tx_id,
              flwRef: r.flw_ref,
              amountRefunded: r.amount_refunded,
              status: r.status,
              destination: r.destination,
              createdAt: r.created_at,
              comment: r.comment
            }
          ]
        },
        message: `Refund **${r.id}**: ${r.amount_refunded} — Status: **${r.status}**.`
      };
    }

    let result = await client.listRefunds({
      page: ctx.input.page,
      from: ctx.input.from,
      to: ctx.input.to
    });

    let refunds = (result.data || []).map((r: any) => ({
      refundId: r.id,
      transactionId: r.tx_id,
      flwRef: r.flw_ref,
      amountRefunded: r.amount_refunded,
      status: r.status,
      destination: r.destination,
      createdAt: r.created_at,
      comment: r.comment
    }));

    return {
      output: { refunds },
      message: `Found **${refunds.length}** refunds.`
    };
  })
  .build();
