import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dividendSchema = z.object({
  ticker: z.string().optional().describe('Ticker symbol'),
  cashAmount: z.number().optional().describe('Cash amount per share'),
  declarationDate: z.string().optional().describe('Declaration date'),
  exDividendDate: z.string().optional().describe('Ex-dividend date'),
  recordDate: z.string().optional().describe('Record date'),
  payDate: z.string().optional().describe('Pay date'),
  frequency: z
    .number()
    .optional()
    .describe('Frequency (0=one-time, 1=annual, 2=biannual, 4=quarterly, 12=monthly)'),
  dividendType: z
    .string()
    .optional()
    .describe('Type (CD=cash, SC=special cash, LT=long-term, ST=short-term)'),
  currency: z.string().optional().describe('Currency')
});

let splitSchema = z.object({
  ticker: z.string().optional().describe('Ticker symbol'),
  executionDate: z.string().optional().describe('Execution date of the split'),
  splitFrom: z.number().optional().describe('Split from ratio'),
  splitTo: z.number().optional().describe('Split to ratio')
});

export let getDividendsSplits = SlateTool.create(spec, {
  name: 'Get Dividends & Splits',
  key: 'get_dividends_splits',
  description: `Retrieve historical dividend and stock split data for a ticker. Useful for tracking corporate actions, dividend history, and split-adjusted analysis. Can fetch dividends, splits, or both.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Ticker symbol (e.g., "AAPL")'),
      dataType: z
        .enum(['dividends', 'splits', 'both'])
        .optional()
        .default('both')
        .describe('Type of data to retrieve'),
      dateFrom: z.string().optional().describe('Start date for filtering (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date for filtering (YYYY-MM-DD)'),
      order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order by date'),
      limit: z.number().optional().default(20).describe('Maximum number of results per type')
    })
  )
  .output(
    z.object({
      dividends: z.array(dividendSchema).optional().describe('Array of dividend records'),
      splits: z.array(splitSchema).optional().describe('Array of stock split records'),
      dividendCount: z.number().optional().describe('Number of dividends returned'),
      splitCount: z.number().optional().describe('Number of splits returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let dividends: any[] | undefined;
    let splits: any[] | undefined;

    if (ctx.input.dataType === 'dividends' || ctx.input.dataType === 'both') {
      let divData = await client.getDividends({
        ticker: ctx.input.ticker,
        exDividendDateGte: ctx.input.dateFrom,
        exDividendDateLte: ctx.input.dateTo,
        order: ctx.input.order,
        sort: 'ex_dividend_date',
        limit: ctx.input.limit
      });
      dividends = (divData.results || []).map((d: any) => ({
        ticker: d.ticker,
        cashAmount: d.cash_amount,
        declarationDate: d.declaration_date,
        exDividendDate: d.ex_dividend_date,
        recordDate: d.record_date,
        payDate: d.pay_date,
        frequency: d.frequency,
        dividendType: d.dividend_type,
        currency: d.currency
      }));
    }

    if (ctx.input.dataType === 'splits' || ctx.input.dataType === 'both') {
      let splitData = await client.getStockSplits({
        ticker: ctx.input.ticker,
        executionDateGte: ctx.input.dateFrom,
        executionDateLte: ctx.input.dateTo,
        order: ctx.input.order,
        sort: 'execution_date',
        limit: ctx.input.limit
      });
      splits = (splitData.results || []).map((s: any) => ({
        ticker: s.ticker,
        executionDate: s.execution_date,
        splitFrom: s.split_from,
        splitTo: s.split_to
      }));
    }

    let parts: string[] = [];
    if (dividends) parts.push(`**${dividends.length}** dividend(s)`);
    if (splits) parts.push(`**${splits.length}** split(s)`);

    return {
      output: {
        dividends,
        splits,
        dividendCount: dividends?.length,
        splitCount: splits?.length
      },
      message: `Retrieved ${parts.join(' and ')} for **${ctx.input.ticker}**.`
    };
  })
  .build();
