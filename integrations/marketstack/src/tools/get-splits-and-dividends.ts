import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSplitsAndDividends = SlateTool.create(spec, {
  name: 'Get Splits & Dividends',
  key: 'get_splits_and_dividends',
  description: `Retrieve historical stock split factors and/or dividend payment information for one or more tickers. Specify the \`type\` field to fetch splits only, dividends only, or both. Supports filtering by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z.string().describe('Comma-separated ticker symbols (e.g. "AAPL,MSFT")'),
      type: z
        .enum(['splits', 'dividends', 'both'])
        .describe('Which corporate action type to retrieve'),
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format'),
      sort: z.enum(['ASC', 'DESC']).optional().describe('Sort order by date'),
      limit: z.number().optional().describe('Number of results per type (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      splits: z
        .array(
          z.object({
            symbol: z.string(),
            date: z.string(),
            splitFactor: z.number()
          })
        )
        .optional(),
      dividends: z
        .array(
          z.object({
            symbol: z.string(),
            date: z.string(),
            dividend: z.number()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { type, symbols, dateFrom, dateTo, sort, limit, offset } = ctx.input;

    let splits: { symbol: string; date: string; splitFactor: number }[] | undefined;
    let dividends: { symbol: string; date: string; dividend: number }[] | undefined;

    if (type === 'splits' || type === 'both') {
      let result = await client.getSplits({ symbols, dateFrom, dateTo, sort, limit, offset });
      splits = result.data.map(s => ({
        symbol: s.symbol,
        date: s.date,
        splitFactor: s.split_factor
      }));
    }

    if (type === 'dividends' || type === 'both') {
      let result = await client.getDividends({
        symbols,
        dateFrom,
        dateTo,
        sort,
        limit,
        offset
      });
      dividends = result.data.map(d => ({
        symbol: d.symbol,
        date: d.date,
        dividend: d.dividend
      }));
    }

    let parts: string[] = [];
    if (splits) parts.push(`${splits.length} split(s)`);
    if (dividends) parts.push(`${dividends.length} dividend(s)`);

    return {
      output: { splits, dividends },
      message: `Retrieved ${parts.join(' and ')} for **${symbols}**.`
    };
  })
  .build();
