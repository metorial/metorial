import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import {
  polygonCursor,
  polygonRawOutput,
  polygonRecords,
  polygonResponseFields,
  validatePolygonLimit
} from '../lib/response';
import { spec } from '../spec';

export let getFinancialStatements = SlateTool.create(spec, {
  name: 'Get Financial Statements',
  key: 'get_financial_statements',
  description:
    'Retrieve current income statements, balance sheets, or cash flow statements with period, filing-date, and fiscal-year filters. Returns complete financial line items for analysis.',
  constraints: [
    'Requires a subscription or add-on with financial statements access.',
    'Balance sheets support annual and quarterly periods; income and cash flow statements also support trailing twelve months.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      statementType: z.enum(['income_statement', 'balance_sheet', 'cash_flow_statement']),
      ticker: z
        .string()
        .optional()
        .describe(
          'One stock ticker to match in the company ticker list. Use search_tickers to discover symbols.'
        ),
      cik: z
        .string()
        .optional()
        .describe('SEC company CIK, available from get_ticker_details.'),
      timeframe: z.enum(['annual', 'quarterly', 'trailing_twelve_months']).optional(),
      periodEndFrom: z.string().optional().describe('Earliest period end, YYYY-MM-DD.'),
      periodEndTo: z.string().optional().describe('Latest period end, YYYY-MM-DD.'),
      filingDateFrom: z
        .string()
        .optional()
        .describe('Earliest most recent filing date, YYYY-MM-DD.'),
      filingDateTo: z
        .string()
        .optional()
        .describe('Latest most recent filing date, YYYY-MM-DD.'),
      fiscalYear: z.number().int().optional(),
      fiscalQuarter: z.number().int().min(1).max(4).optional(),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50000)
        .optional()
        .describe('Page size; provider default is 100.'),
      sort: z
        .string()
        .optional()
        .describe('Comma-separated columns with .asc or .desc, e.g. period_end.desc.'),
      cursor: polygonCursor
    })
  )
  .output(
    z.object({
      ...polygonResponseFields,
      statements: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Complete provider statement records, including financial line items and reporting-period metadata.'
        )
    })
  )
  .handleInvocation(async ctx => {
    validatePolygonLimit(ctx.input.limit, 50000);
    if (
      ctx.input.statementType === 'balance_sheet' &&
      ctx.input.timeframe === 'trailing_twelve_months'
    ) {
      throw createApiServiceError(
        'Balance sheets support annual or quarterly timeframe. Choose one of those periods.'
      );
    }
    let kinds = {
      income_statement: 'income-statements',
      balance_sheet: 'balance-sheets',
      cash_flow_statement: 'cash-flow-statements'
    } as const;
    let client = new PolygonClient(ctx.auth.token);
    let response = await client.getFinancialStatements(
      kinds[ctx.input.statementType],
      ctx.input
    );
    let statements = polygonRecords(response.results, 'results', true);
    return {
      output: polygonRawOutput({ statements }, response),
      message: `Retrieved ${statements.length} financial statement records.`
    };
  })
  .build();
