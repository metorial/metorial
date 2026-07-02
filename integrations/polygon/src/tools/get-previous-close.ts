import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getPreviousClose = SlateTool.create(spec, {
  name: 'Get Previous Close',
  key: 'get_previous_close',
  description: `Retrieve the previous day's OHLCV bar for any ticker (stocks, forex, crypto, options, indices). Useful for comparing current prices against the prior trading day's close.`,
  instructions: [
    'For forex pairs, prefix with C: (e.g., C:EURUSD). For crypto, use X: (e.g., X:BTCUSD). For indices, use I: (e.g., I:SPX).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol (e.g., AAPL, C:EURUSD, X:BTCUSD)'),
      adjusted: z
        .boolean()
        .optional()
        .describe('Whether results are adjusted for splits. Defaults to true.')
    })
  )
  .output(
    z.object({
      ticker: z.string().optional().describe('Ticker symbol'),
      bars: z
        .array(
          z.object({
            open: z.number().optional(),
            high: z.number().optional(),
            low: z.number().optional(),
            close: z.number().optional(),
            volume: z.number().optional(),
            volumeWeightedAvgPrice: z.number().optional(),
            timestamp: z.number().optional(),
            transactionCount: z.number().optional()
          })
        )
        .describe('Previous close bar(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let response = await client.getPreviousClose({
      ticker: ctx.input.ticker,
      adjusted: ctx.input.adjusted
    });

    let bars = (response.results || []).map((r: any) => ({
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
      volumeWeightedAvgPrice: r.vw,
      timestamp: r.t,
      transactionCount: r.n
    }));

    let closePrice = bars.length > 0 ? bars[0].close : undefined;

    return {
      output: {
        ticker: response.ticker,
        bars
      },
      message:
        closePrice !== undefined
          ? `Previous close for **${ctx.input.ticker}**: $${closePrice}.`
          : `Retrieved previous close data for **${ctx.input.ticker}**.`
    };
  })
  .build();
