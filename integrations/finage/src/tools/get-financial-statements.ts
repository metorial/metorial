import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { finageRecords, finageSymbol, validateFinageLimit } from '../lib/response';
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
      raw: z.unknown().optional().describe('Original provider response'),
      symbol: z.string().describe('Company ticker symbol'),
      statementType: z.string().describe('Type of financial statement returned'),
      statements: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of financial statement records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinageClient({ token: ctx.auth.token });
    let { statementType, period, limit } = ctx.input;
    let symbol = finageSymbol(ctx.input.symbol);
    validateFinageLimit(limit, 'Limit');
    let data =
      statementType === 'income_statement'
        ? await client.getIncomeStatement(symbol, { limit, period })
        : statementType === 'balance_sheet'
          ? await client.getBalanceSheet(symbol, { limit, period })
          : await client.getCashFlow(symbol, { limit, period });
    let statements = finageRecords(data, ['results', 'financials']);
    return {
      output: { symbol, statementType, statements, raw: data },
      message: `Retrieved **${statements.length}** ${period} ${statementType.replaceAll('_', ' ')} records for **${symbol}**.`
    };
  })
  .build();
