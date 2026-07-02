import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwelveDataClient } from '../lib/client';
import { spec } from '../spec';

export let getFinancialStatements = SlateTool.create(spec, {
  name: 'Get Financial Statements',
  key: 'get_financial_statements',
  description: `Retrieve financial statements for a company: Income Statement, Balance Sheet, and/or Cash Flow Statement.
Choose which statement type(s) to fetch. Historical data is available from the 1980s–90s depending on the company.
Supports both annual and quarterly reporting periods.`,
  instructions: [
    'Specify one or more statement types to fetch.',
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
      symbol: z.string().describe('Ticker symbol'),
      statementType: z.string().describe('Type of statement returned'),
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

    let statements =
      result[ctx.input.statementType] ||
      result.income_statement ||
      result.balance_sheet ||
      result.cash_flow ||
      [];

    return {
      output: {
        symbol: result.meta?.symbol || ctx.input.symbol,
        statementType: ctx.input.statementType,
        statements: Array.isArray(statements) ? statements : [statements]
      },
      message: `Retrieved **${ctx.input.statementType.replace('_', ' ')}** for **${ctx.input.symbol}** (${ctx.input.period || 'annual'}).`
    };
  })
  .build();
