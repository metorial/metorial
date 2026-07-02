import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';
import { mapPayout, payoutSchema } from './payout-utils';

export let getPayout = SlateTool.create(spec, {
  name: 'Get Payout',
  key: 'get_payout',
  description: `Retrieve details for a specific Gumroad payout, optionally including sale IDs and exported transaction rows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      payoutId: z.string().describe('The Gumroad payout ID to retrieve'),
      includeSales: z
        .boolean()
        .optional()
        .describe('Whether to include sales, refundedSales, and disputedSales'),
      includeTransactions: z
        .boolean()
        .optional()
        .describe('Whether to include transaction rows matching the exported payout CSV')
    })
  )
  .output(
    z.object({
      payout: payoutSchema.describe('Payout details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let payout = await client.getPayout(ctx.input.payoutId, {
      includeSales: ctx.input.includeSales,
      includeTransactions: ctx.input.includeTransactions
    });

    return {
      output: { payout: mapPayout(payout) },
      message: `Retrieved payout **${ctx.input.payoutId}**.`
    };
  })
  .build();
