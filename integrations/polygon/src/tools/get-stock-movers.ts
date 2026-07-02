import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getStockMovers = SlateTool.create(spec, {
  name: 'Get Market Movers',
  key: 'get_market_movers',
  description: `Retrieve the top 20 gainers or losers of the day for stocks, forex, or crypto markets. Useful for identifying the day's biggest price movements and trending tickers.`,
  constraints: [
    'Only includes tickers with a trading volume of 10,000 or more.',
    'Returns the top 20 tickers in the specified direction.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      market: z.enum(['stocks', 'forex', 'crypto']).describe('Market to get movers for'),
      direction: z
        .enum(['gainers', 'losers'])
        .describe('Whether to get top gainers or top losers')
    })
  )
  .output(
    z.object({
      movers: z
        .array(
          z.object({
            ticker: z.string().optional().describe('Ticker symbol'),
            todaysChange: z.number().optional().describe('Absolute price change'),
            todaysChangePercent: z.number().optional().describe('Percentage price change'),
            day: z
              .object({
                open: z.number().optional(),
                high: z.number().optional(),
                low: z.number().optional(),
                close: z.number().optional(),
                volume: z.number().optional(),
                volumeWeightedAvgPrice: z.number().optional()
              })
              .optional()
              .describe('Current day aggregate')
          })
        )
        .describe('Top movers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let response: any;
    if (ctx.input.market === 'stocks') {
      response = await client.getStockMovers(ctx.input.direction);
    } else if (ctx.input.market === 'forex') {
      response = await client.getForexMovers(ctx.input.direction);
    } else {
      response = await client.getCryptoMovers(ctx.input.direction);
    }

    let movers = (response.tickers || []).map((t: any) => ({
      ticker: t.ticker,
      todaysChange: t.todaysChange,
      todaysChangePercent: t.todaysChangePerc,
      day: t.day
        ? {
            open: t.day.o,
            high: t.day.h,
            low: t.day.l,
            close: t.day.c,
            volume: t.day.v,
            volumeWeightedAvgPrice: t.day.vw
          }
        : undefined
    }));

    return {
      output: { movers },
      message: `Top ${ctx.input.direction} in ${ctx.input.market}: **${movers.length}** tickers returned.`
    };
  })
  .build();
