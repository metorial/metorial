import { SlateTool } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

let dividendSchema = z.object({
  date: z.string().describe('Ex-dividend date'),
  declarationDate: z.string().optional().nullable().describe('Declaration date'),
  recordDate: z.string().optional().nullable().describe('Record date'),
  paymentDate: z.string().optional().nullable().describe('Payment date'),
  period: z.string().optional().nullable().describe('Dividend period'),
  value: z.number().describe('Dividend amount per share'),
  unadjustedValue: z.number().optional().nullable().describe('Unadjusted dividend value'),
  currency: z.string().optional().nullable().describe('Currency of dividend')
});

let splitSchema = z.object({
  date: z.string().describe('Split date'),
  split: z.string().describe('Split ratio, e.g., "4/1"')
});

export let getDividendsSplits = SlateTool.create(spec, {
  name: 'Get Dividends & Splits',
  key: 'get_dividends_splits',
  description: `Retrieve historical dividend payments and stock split data for any supported ticker. Returns dividend amounts, dates, and split ratios within the specified date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol with exchange, e.g., AAPL.US'),
      dataType: z
        .enum(['dividends', 'splits', 'both'])
        .optional()
        .describe('Type of corporate action data to retrieve (default: both)'),
      from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      to: z.string().optional().describe('End date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      ticker: z.string().describe('Requested ticker symbol'),
      dividends: z.array(dividendSchema).optional().describe('Historical dividend records'),
      splits: z.array(splitSchema).optional().describe('Historical split records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EodhdClient({ token: ctx.auth.token });
    let dataType = ctx.input.dataType || 'both';
    let dividends: unknown[] | undefined;
    let splits: unknown[] | undefined;

    if (dataType === 'dividends' || dataType === 'both') {
      let divResult = await client.getDividends(ctx.input.ticker, {
        from: ctx.input.from,
        to: ctx.input.to
      });
      dividends = Array.isArray(divResult) ? divResult : [];
    }

    if (dataType === 'splits' || dataType === 'both') {
      let splitResult = await client.getSplits(ctx.input.ticker, {
        from: ctx.input.from,
        to: ctx.input.to
      });
      splits = Array.isArray(splitResult) ? splitResult : [];
    }

    let parts: string[] = [];
    if (dividends) parts.push(`**${dividends.length}** dividends`);
    if (splits) parts.push(`**${splits.length}** splits`);

    return {
      output: {
        ticker: ctx.input.ticker,
        dividends: dividends as any,
        splits: splits as any
      },
      message: `Retrieved ${parts.join(' and ')} for **${ctx.input.ticker}**.`
    };
  })
  .build();
