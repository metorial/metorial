import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getDividendsAndSplits = SlateTool.create(spec, {
  name: 'Get Dividends & Splits',
  key: 'get_dividends_and_splits',
  description: `Retrieve dividend history, stock split history, or both for a given company.
Useful for tracking corporate actions and understanding historical capital events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol (e.g., "AAPL", "MSFT")'),
      dataType: z.enum(['dividends', 'splits', 'both']).describe('Type of data to retrieve'),
      exchange: z.string().optional().describe('Exchange where the instrument is traded'),
      country: z.string().optional().describe('Country of the exchange'),
      range: z
        .string()
        .optional()
        .describe('Time range (e.g., "1month", "3months", "1year", "5years", "full")'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      dividends: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of dividend records'),
      splits: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of stock split records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let baseParams = {
      symbol: ctx.input.symbol,
      exchange: ctx.input.exchange,
      country: ctx.input.country,
      range: ctx.input.range,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    };

    let dividends: any[] | undefined;
    let splits: any[] | undefined;

    if (ctx.input.dataType === 'dividends' || ctx.input.dataType === 'both') {
      let divResult = await client.getDividends(baseParams);
      dividends = divResult.dividends || [];
    }

    if (ctx.input.dataType === 'splits' || ctx.input.dataType === 'both') {
      let splitResult = await client.getSplits(baseParams);
      splits = splitResult.splits || [];
    }

    let parts: string[] = [];
    if (dividends) parts.push(`**${dividends.length}** dividends`);
    if (splits) parts.push(`**${splits.length}** splits`);

    return {
      output: {
        symbol: ctx.input.symbol,
        dividends,
        splits
      },
      message: `Retrieved ${parts.join(' and ')} for **${ctx.input.symbol}**.`
    };
  })
  .build();
