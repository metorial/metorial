import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let getFinancialStatements = SlateTool.create(spec, {
  name: 'Get Financial Statements',
  key: 'get_financial_statements',
  description: `Retrieve financial statements for a company, including income statements, balance sheets, and cash flow statements. Covers US, European, and Canadian companies with up to 30 years of historical data. Choose the statement type and reporting period.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z
        .string()
        .describe('Company ticker symbol (e.g. "AAPL", "MSFT", "TBP.TO" for international)'),
      statementType: z
        .enum(['income_statement', 'balance_sheet', 'cash_flow'])
        .describe('Type of financial statement'),
      period: z.enum(['annual', 'quarter']).default('annual').describe('Reporting period'),
      limit: z.number().default(5).describe('Number of periods to return')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Company ticker symbol'),
      statementType: z.string().describe('Type of financial statement returned'),
      statements: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of financial statement records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { symbol, statementType, period, limit } = ctx.input;

    let data: any;
    if (statementType === 'income_statement') {
      data = await client.getIncomeStatement(symbol, { limit, period });
    } else if (statementType === 'balance_sheet') {
      data = await client.getBalanceSheet(symbol, { limit, period });
    } else {
      data = await client.getCashFlow(symbol, { limit, period });
    }

    let statements = Array.isArray(data) ? data : data?.results || data?.financials || [data];

    return {
      output: {
        symbol: symbol.toUpperCase(),
        statementType,
        statements
      },
      message: `Retrieved **${statements.length}** ${period} ${statementType.replace('_', ' ')} records for **${symbol.toUpperCase()}**.`
    };
  })
  .build();
