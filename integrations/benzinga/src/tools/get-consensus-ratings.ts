import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

export let getConsensusRatingsTool = SlateTool.create(spec, {
  key: 'get_consensus_ratings',
  name: 'Get Consensus Ratings',
  description:
    'Retrieve aggregate analyst ratings, consensus price targets, rating distribution, and analyst counts for one ticker.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ticker: z.string().describe('One stock ticker symbol'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      simplify: z.boolean().optional().describe('Combine ratings into BUY, SELL, and HOLD'),
      aggregateType: z
        .enum(['number', 'percentage'])
        .optional()
        .describe('Return rating counts or percentages'),
      pageSize: z.number().optional().describe('Maximum ratings to aggregate, up to 1000')
    })
  )
  .output(
    z.object({
      consensus: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original consensus data; omitted when the provider returns no content')
    })
  )
  .handleInvocation(async ctx => {
    let data = await new BenzingaClient({ token: ctx.auth.token }).getConsensusRatings(
      ctx.input
    );
    return {
      output: { consensus: data || undefined },
      message: data
        ? `Retrieved consensus ratings for ${ctx.input.ticker}.`
        : `No consensus data returned for ${ctx.input.ticker}.`
    };
  })
  .build();
