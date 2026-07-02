import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';
import { mapPayout, payoutSchema } from './payout-utils';

export let listPayouts = SlateTool.create(spec, {
  name: 'List Payouts',
  key: 'list_payouts',
  description: `Retrieve Gumroad payouts for the authenticated user. Supports date filtering, cursor pagination, and optional exclusion of upcoming payouts.`,
  instructions: [
    'Use after/before dates in YYYY-MM-DD format.',
    'Use pageKey from a previous response to get the next page of results.',
    'Set includeUpcoming to false when you only need historical payout records.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      after: z
        .string()
        .optional()
        .describe('Only return payouts after this date (YYYY-MM-DD)'),
      before: z
        .string()
        .optional()
        .describe('Only return payouts before this date (YYYY-MM-DD)'),
      pageKey: z.string().optional().describe('Pagination cursor from previous response'),
      includeUpcoming: z
        .boolean()
        .optional()
        .describe('Whether to include upcoming payouts. Gumroad defaults to true.')
    })
  )
  .output(
    z.object({
      payouts: z.array(payoutSchema).describe('List of payouts'),
      nextPageKey: z.string().optional().describe('Cursor for the next page of results'),
      nextPageUrl: z.string().optional().describe('URL for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let result = await client.listPayouts({
      after: ctx.input.after,
      before: ctx.input.before,
      pageKey: ctx.input.pageKey,
      includeUpcoming: ctx.input.includeUpcoming
    });

    let mapped = result.payouts.map(mapPayout);

    return {
      output: {
        payouts: mapped,
        nextPageKey: result.nextPageKey,
        nextPageUrl: result.nextPageUrl
      },
      message: `Found **${mapped.length}** payout(s).${result.nextPageKey ? ' More results are available with pagination.' : ''}`
    };
  })
  .build();
