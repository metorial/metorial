import { SlateTool } from 'slates';
import { z } from 'zod';
import { BenzingaClient } from '../lib/client';
import { spec } from '../spec';

let moverItemSchema = z.object({
  symbol: z.string().optional().describe('Ticker symbol'),
  companyName: z.string().optional().describe('Company name'),
  change: z.number().optional().describe('Price change amount'),
  changePercent: z.number().optional().describe('Percentage price change'),
  close: z.number().optional().describe('Current/last price'),
  volume: z.number().optional().describe('Trading volume'),
  averageVolume: z.number().optional().describe('50-day average volume'),
  previousClose: z.number().optional().describe('Prior session closing price')
});

export let getMarketMoversTool = SlateTool.create(spec, {
  name: 'Get Market Movers',
  key: 'get_market_movers',
  description: `Identify the top gaining, losing, and most active securities across exchanges. Supports filtering by market session (regular, pre-market, after-market) and screener criteria.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      session: z
        .enum(['REGULAR', 'PRE_MARKET', 'AFTER_MARKET'])
        .optional()
        .default('REGULAR')
        .describe('Market session to report for'),
      maxResults: z
        .number()
        .optional()
        .default(10)
        .describe('Max number of gainers/losers to return (max 1000)'),
      from: z
        .string()
        .optional()
        .describe('Start period (YYYY-MM-DD, timestamp, or relative like "1D", "-1W", "YTD")'),
      to: z.string().optional().describe('End period (YYYY-MM-DD or timestamp)'),
      screenerQuery: z
        .string()
        .optional()
        .describe(
          'Filter conditions separated by semicolons (e.g. "marketcap_gt_1b;close_gt_5")'
        )
    })
  )
  .output(
    z.object({
      gainers: z.array(moverItemSchema).describe('Top gaining securities'),
      losers: z.array(moverItemSchema).describe('Top losing securities'),
      fromDate: z.string().optional().describe('Period start'),
      toDate: z.string().optional().describe('Period end')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BenzingaClient({ token: ctx.auth.token });

    let data = await client.getMovers({
      session: ctx.input.session,
      maxResults: ctx.input.maxResults,
      from: ctx.input.from,
      to: ctx.input.to,
      screenerQuery: ctx.input.screenerQuery
    });

    let result = data?.result || data || {};
    let gainers = (result.gainers || []).map((g: any) => ({
      symbol: g.symbol,
      companyName: g.companyName,
      change: g.change,
      changePercent: g.changePercent,
      close: g.close,
      volume: g.volume,
      averageVolume: g.averageVolume,
      previousClose: g.previousClose
    }));
    let losers = (result.losers || []).map((l: any) => ({
      symbol: l.symbol,
      companyName: l.companyName,
      change: l.change,
      changePercent: l.changePercent,
      close: l.close,
      volume: l.volume,
      averageVolume: l.averageVolume,
      previousClose: l.previousClose
    }));

    return {
      output: {
        gainers,
        losers,
        fromDate: result.fromDate,
        toDate: result.toDate
      },
      message: `Found **${gainers.length}** gainer(s) and **${losers.length}** loser(s) for ${ctx.input.session || 'REGULAR'} session.`
    };
  })
  .build();
