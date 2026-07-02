import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getSplitsDividends = SlateTool.create(spec, {
  name: 'Get Splits & Dividends',
  key: 'get_splits_dividends',
  description: `Retrieve stock split and dividend history. Filter by ticker and date range. Useful for tracking corporate actions that affect share prices and calculating adjusted returns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dataType: z
        .enum(['splits', 'dividends'])
        .describe('Type of corporate action data to retrieve'),
      ticker: z.string().optional().describe('Filter by ticker symbol'),
      dateFrom: z
        .string()
        .optional()
        .describe('Minimum execution/ex-dividend date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Maximum execution/ex-dividend date (YYYY-MM-DD)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().int().optional().describe('Max number of results')
    })
  )
  .output(
    z.object({
      splits: z
        .array(
          z.object({
            ticker: z.string().optional(),
            executionDate: z.string().optional(),
            splitFrom: z.number().optional().describe('Pre-split shares'),
            splitTo: z.number().optional().describe('Post-split shares')
          })
        )
        .optional()
        .describe('Stock splits'),
      dividends: z
        .array(
          z.object({
            ticker: z.string().optional(),
            exDividendDate: z.string().optional(),
            payDate: z.string().optional(),
            recordDate: z.string().optional(),
            declarationDate: z.string().optional(),
            cashAmount: z.number().optional().describe('Cash dividend amount per share'),
            currency: z.string().optional(),
            frequency: z
              .number()
              .optional()
              .describe(
                'Dividend frequency (1=annual, 2=semi-annual, 4=quarterly, 12=monthly)'
              ),
            dividendType: z.string().optional()
          })
        )
        .optional()
        .describe('Dividends')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    if (ctx.input.dataType === 'splits') {
      let response = await client.getStockSplits({
        ticker: ctx.input.ticker,
        executionDateGte: ctx.input.dateFrom,
        executionDateLte: ctx.input.dateTo,
        order: ctx.input.order,
        limit: ctx.input.limit
      });

      let splits = (response.results || []).map((r: any) => ({
        ticker: r.ticker,
        executionDate: r.execution_date,
        splitFrom: r.split_from,
        splitTo: r.split_to
      }));

      return {
        output: { splits },
        message: `Retrieved **${splits.length}** stock split(s)${ctx.input.ticker ? ` for **${ctx.input.ticker}**` : ''}.`
      };
    }

    let response = await client.getDividends({
      ticker: ctx.input.ticker,
      exDividendDateGte: ctx.input.dateFrom,
      exDividendDateLte: ctx.input.dateTo,
      order: ctx.input.order,
      limit: ctx.input.limit
    });

    let dividends = (response.results || []).map((r: any) => ({
      ticker: r.ticker,
      exDividendDate: r.ex_dividend_date,
      payDate: r.pay_date,
      recordDate: r.record_date,
      declarationDate: r.declaration_date,
      cashAmount: r.cash_amount,
      currency: r.currency,
      frequency: r.frequency,
      dividendType: r.type
    }));

    return {
      output: { dividends },
      message: `Retrieved **${dividends.length}** dividend(s)${ctx.input.ticker ? ` for **${ctx.input.ticker}**` : ''}.`
    };
  })
  .build();
