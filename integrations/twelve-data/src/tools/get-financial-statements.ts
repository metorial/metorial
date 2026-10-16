import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { record, records, requiredString } from '../lib/response';
import { spec } from '../spec';

export let getFinancialStatements = SlateTool.create(spec, {
  name: 'Get Financial Statements',
  key: 'get_financial_statements',
  description: `Retrieve financial statements for a company: Income Statement, Balance Sheet, and/or Cash Flow Statement.
Select one statement type per call. Coverage and historical depth depend on the company and subscription.
Supports both annual and quarterly reporting periods.`,
  instructions: [
    'Select the statement type to fetch.',
    'Use "annual" period for yearly data or "quarterly" for quarterly reports.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol (e.g., "AAPL", "MSFT")'),
      statementType: z
        .enum(['income_statement', 'balance_sheet', 'cash_flow'])
        .describe('Type of financial statement to retrieve'),
      period: z
        .enum(['annual', 'quarterly'])
        .optional()
        .describe('Reporting period (default: "annual")'),
      exchange: z.string().optional().describe('Exchange where the instrument is traded'),
      country: z.string().optional().describe('Country of the exchange'),
      startDate: z.string().optional().describe('Start date for the data range (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date for the data range (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response, preserving unavailable values and metadata'),
      symbol: z.string().describe('Ticker symbol'),
      statementType: z
        .string()
        .describe('Requested financial-statement endpoint corresponding to the returned rows'),
      statements: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of financial statement records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwelveDataClient(ctx.auth.token);

    let baseParams = {
      symbol: ctx.input.symbol,
      exchange: ctx.input.exchange,
      country: ctx.input.country,
      period: ctx.input.period,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    };

    let result: any;
    if (ctx.input.statementType === 'income_statement') {
      result = await client.getIncomeStatement(baseParams);
    } else if (ctx.input.statementType === 'balance_sheet') {
      result = await client.getBalanceSheet(baseParams);
    } else {
      result = await client.getCashFlow(baseParams);
    }

    let meta = record(result.meta, 'meta');
    let statements = records(result[ctx.input.statementType], ctx.input.statementType);

    return {
      output: {
        raw: result,
        symbol: requiredString(meta.symbol, 'meta.symbol'),
        statementType: ctx.input.statementType,
        statements
      },
      message: `Retrieved **${ctx.input.statementType.replace('_', ' ')}** for **${ctx.input.symbol}** (${ctx.input.period || 'annual'}).`
    };
  })
  .build();
