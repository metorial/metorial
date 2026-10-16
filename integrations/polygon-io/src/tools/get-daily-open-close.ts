import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRows } from '../lib/response';
import { spec } from '../spec';

export let getDailyOpenClose = SlateTool.create(spec, {
  name: 'Get Daily Open/Close',
  key: 'get_daily_open_close',
  description: `Retrieve the open, close, high, low, volume, and after-hours/pre-market prices for a stock on a specific date. Also supports fetching the previous trading day's close. Useful for quick daily price lookups.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Stock ticker symbol (e.g., "AAPL")'),
      date: z
        .string()
        .optional()
        .describe('Date to retrieve (YYYY-MM-DD). Omit to get previous close.'),
      adjusted: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether results are adjusted for splits')
    })
  )
  .output(
    z.object({
      ticker: z.string().optional().describe('Ticker symbol'),
      from: z.string().optional().describe('Date of the data'),
      open: z.number().optional().describe('Open price'),
      high: z.number().optional().describe('High price'),
      low: z.number().optional().describe('Low price'),
      close: z.number().optional().describe('Close price'),
      volume: z.number().optional().describe('Trading volume'),
      afterHours: z.number().optional().describe('After-hours price'),
      preMarket: z.number().optional().describe('Pre-market price')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.date) {
      let data = await client.getDailyOpenClose({
        ticker: ctx.input.ticker,
        date: ctx.input.date,
        adjusted: ctx.input.adjusted
      });

      return {
        output: {
          ticker: data.symbol ?? undefined,
          from: data.from ?? undefined,
          open: data.open ?? undefined,
          high: data.high ?? undefined,
          low: data.low ?? undefined,
          close: data.close ?? undefined,
          volume: data.volume ?? undefined,
          afterHours: data.afterHours ?? undefined,
          preMarket: data.preMarket ?? undefined
        },
        message: `**${ctx.input.ticker}** on ${ctx.input.date}: Open $${data.open}, Close $${data.close}, High $${data.high}, Low $${data.low}, Volume ${data.volume?.toLocaleString()}.`
      };
    }

    let data = await client.getPreviousClose({
      ticker: ctx.input.ticker,
      adjusted: ctx.input.adjusted
    });

    let result = responseRows(data.results)?.[0];

    return {
      output: {
        ticker: data.ticker ?? undefined,
        from:
          typeof result?.t === 'number' && Number.isFinite(new Date(result.t).getTime())
            ? new Date(result.t).toISOString().slice(0, 10)
            : undefined,
        open: result?.o ?? undefined,
        high: result?.h ?? undefined,
        low: result?.l ?? undefined,
        close: result?.c ?? undefined,
        volume: result?.v ?? undefined
      },
      message: result
        ? `Previous close for **${ctx.input.ticker}**: Open $${result.o}, Close $${result.c}, High $${result.h}, Low $${result.l}, Volume ${result.v?.toLocaleString()}.`
        : `No previous close data found for **${ctx.input.ticker}**.`
    };
  })
  .build();
