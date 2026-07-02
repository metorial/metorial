import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';
import { mapPayout, payoutSchema } from './payout-utils';

export let getUpcomingPayouts = SlateTool.create(spec, {
  name: 'Get Upcoming Payouts',
  key: 'get_upcoming_payouts',
  description: `Retrieve upcoming Gumroad payouts for the authenticated user. Gumroad can return up to two upcoming payouts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
      payouts: z.array(payoutSchema).describe('Upcoming payout details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let payouts = await client.getUpcomingPayouts({
      includeSales: ctx.input.includeSales,
      includeTransactions: ctx.input.includeTransactions
    });

    let mapped = payouts.map(mapPayout);

    return {
      output: { payouts: mapped },
      message: `Found **${mapped.length}** upcoming payout(s).`
    };
  })
  .build();
