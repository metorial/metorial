import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient, recordsFrom } from '../lib/client';
import { spec } from '../spec';

export let getTrendingTickersTool = SlateTool.create(spec, {
  key: 'get_trending_tickers',
  name: 'Get Trending Tickers',
  description:
    'Retrieve a ranked list of trending securities and engagement scores from Benzinga Ticker Trends. Filter by source, timeframe, tickers, or date and time range.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      source: z
        .enum(['all', 'clickstream', 'logo'])
        .optional()
        .default('all')
        .describe('Source of engagement data'),
      timeframe: z
        .enum(['10m', '1h', '1d'])
        .optional()
        .default('1d')
        .describe('Trend aggregation window'),
      tickers: z.string().optional().describe('Comma-separated ticker symbols'),
      dateFrom: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date (YYYY-MM-DD)'),
      timeFrom: z.string().optional().describe('Start time in 24-hour HH:MM format'),
      timeTo: z.string().optional().describe('End time in 24-hour HH:MM format'),
      page: z.number().optional().default(0).describe('Zero-based result page'),
      pageSize: z.number().optional().default(100).describe('Results per page, up to 1000')
    })
  )
  .output(
    z.object({
      tickers: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Ranked ticker records with original identifiers and engagement metrics'),
      count: z.number(),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let data = await new BenzingaClient({ token: ctx.auth.token }).getTrendingTickers(
      ctx.input
    );
    let tickers = recordsFrom(data);
    return {
      output: { tickers, count: tickers.length, raw: data },
      message: `Retrieved ${tickers.length} trending ticker(s).`
    };
  })
  .build();
