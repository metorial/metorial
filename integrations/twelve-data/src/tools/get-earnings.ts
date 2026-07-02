import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getEarnings = SlateTool.create(spec, {
  name: 'Get Earnings',
  key: 'get_earnings',
  description: `Retrieve earnings data for a company, including historical EPS, revenue, and earnings surprises.
Can also retrieve upcoming earnings dates via the earnings calendar.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol (e.g., "AAPL", "MSFT", "TSLA")'),
      period: z
        .enum(['annual', 'quarterly'])
        .optional()
        .describe('Reporting period (default: depends on provider)'),
      exchange: z.string().optional().describe('Exchange where the instrument is traded'),
      country: z.string().optional().describe('Country of the exchange'),
      outputsize: z.number().optional().describe('Number of earnings records to return'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      earnings: z.array(z.record(z.string(), z.any())).describe('Array of earnings records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let result = await client.getEarnings({
      symbol: ctx.input.symbol,
      period: ctx.input.period,
      exchange: ctx.input.exchange,
      country: ctx.input.country,
      outputsize: ctx.input.outputsize,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let earnings = result.earnings || [];

    return {
      output: {
        symbol: result.meta?.symbol || ctx.input.symbol,
        earnings: Array.isArray(earnings) ? earnings : [earnings]
      },
      message: `Retrieved **${Array.isArray(earnings) ? earnings.length : 1}** earnings records for **${ctx.input.symbol}**.`
    };
  })
  .build();
