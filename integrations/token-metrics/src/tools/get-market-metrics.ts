import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMarketMetrics = SlateTool.create(spec, {
  name: 'Get Market Metrics',
  key: 'get_market_metrics',
  description: `Retrieve overall crypto market analytics including bullish/bearish market indicators, total crypto market cap, BTC dominance, ETH dominance, and the percentage of coins with high TM Grades. The Market Indicator provides macro-level signals to understand current market conditions.`,
  constraints: ['Date range is limited to 29-day windows per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      metrics: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of market metric records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getMarketMetrics({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let metrics = result?.data ?? [];

    return {
      output: { metrics },
      message: `Retrieved **${metrics.length}** market metric record(s).`
    };
  })
  .build();
