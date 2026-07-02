import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTradingSignals = SlateTool.create(spec, {
  name: 'Get Trading Signals',
  key: 'get_trading_signals',
  description: `Retrieve AI-generated trading signals for long and short positions. Available in both daily and hourly intervals. Signals indicate whether a token is **bullish** (1), **bearish** (-1), or **neutral** (0). Includes metrics like close price, trading volume, and return on investment.`,
  constraints: ['Date range is limited to 29-day windows per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      interval: z.enum(['daily', 'hourly']).describe('Signal interval - daily or hourly'),
      tokenId: z.string().optional().describe('Comma-separated Token Metrics IDs'),
      symbol: z.string().optional().describe('Comma-separated token symbols, e.g. "BTC,ETH"'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      signal: z
        .number()
        .optional()
        .describe('Filter by signal: 1 (bullish), -1 (bearish), 0 (neutral)'),
      category: z.string().optional().describe('Comma-separated categories to filter by'),
      exchange: z.string().optional().describe('Comma-separated exchanges to filter by'),
      minMarketCap: z.number().optional().describe('Minimum market cap in USD'),
      minVolume: z.number().optional().describe('Minimum 24h trading volume in USD'),
      minFdv: z.number().optional().describe('Minimum fully diluted valuation in USD'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      signals: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of trading signal records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params = {
      tokenId: ctx.input.tokenId,
      symbol: ctx.input.symbol,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      signal: ctx.input.signal,
      category: ctx.input.category,
      exchange: ctx.input.exchange,
      marketcap: ctx.input.minMarketCap,
      volume: ctx.input.minVolume,
      fdv: ctx.input.minFdv,
      limit: ctx.input.limit,
      page: ctx.input.page
    };

    let result =
      ctx.input.interval === 'daily'
        ? await client.getTradingSignals(params)
        : await client.getHourlyTradingSignals(params);

    let signals = result?.data ?? [];

    return {
      output: { signals },
      message: `Retrieved **${signals.length}** ${ctx.input.interval} trading signal(s).`
    };
  })
  .build();
