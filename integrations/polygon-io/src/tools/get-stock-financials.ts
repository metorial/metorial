import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  cursorInput,
  cursorOutput,
  financialStatement,
  nextCursor,
  responseRows
} from '../lib/response';
import { spec } from '../spec';

let financialStatementSchema = z
  .record(
    z.string(),
    z
      .object({
        label: z.string().optional(),
        value: z.number().optional(),
        unit: z.string().optional(),
        order: z.number().optional()
      })
      .optional()
  )
  .optional();

let financialReportSchema = z.object({
  ticker: z.string().optional().describe('Ticker symbol'),
  cik: z.string().optional().describe('CIK number'),
  companyName: z.string().optional().describe('Company name'),
  startDate: z.string().optional().describe('Report period start date'),
  endDate: z.string().optional().describe('Report period end date'),
  filingDate: z.string().optional().describe('Filing date'),
  fiscalPeriod: z.string().optional().describe('Fiscal period (Q1, Q2, Q3, Q4, FY, TTM)'),
  fiscalYear: z.string().optional().describe('Fiscal year'),
  sourceFilingUrl: z.string().optional().describe('Source SEC filing URL'),
  sourceFilingFileUrl: z.string().optional().describe('Direct filing file URL'),
  incomeStatement: financialStatementSchema.describe('Income statement data'),
  balanceSheet: financialStatementSchema.describe('Balance sheet data'),
  cashFlowStatement: financialStatementSchema.describe('Cash flow statement data'),
  comprehensiveIncome: financialStatementSchema.describe('Comprehensive income data')
});

export let getStockFinancials = SlateTool.create(spec, {
  name: 'Get Stock Financials',
  key: 'get_stock_financials',
  description: `Retrieve legacy financial reports (10-K and 10-Q) for US companies. Includes income statements, balance sheets, cash flow statements, and comprehensive income data sourced from SEC Edgar.`,
  instructions: ['Use timeframe "annual" for 10-K reports and "quarterly" for 10-Q reports.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: cursorInput,
      ticker: z.string().describe('Stock ticker symbol (e.g., "AAPL")'),
      timeframe: z
        .enum(['annual', 'quarterly', 'ttm'])
        .optional()
        .describe('Reporting timeframe'),
      filingDateGte: z.string().optional().describe('Filing date on or after (YYYY-MM-DD)'),
      filingDateLte: z.string().optional().describe('Filing date on or before (YYYY-MM-DD)'),
      periodOfReportDateGte: z
        .string()
        .optional()
        .describe('Report period date on or after (YYYY-MM-DD)'),
      periodOfReportDateLte: z
        .string()
        .optional()
        .describe('Report period date on or before (YYYY-MM-DD)'),
      includeSources: z.boolean().optional().describe('Include source filing URLs'),
      order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order'),
      limit: z.number().optional().default(5).describe('Max number of reports to return')
    })
  )
  .output(
    z.object({
      nextCursor: cursorOutput,
      rawReports: z
        .array(z.unknown())
        .optional()
        .describe(
          'Original provider reports, preserving financial source fields and null values.'
        ),
      reports: z.array(financialReportSchema).describe('Array of financial reports'),
      count: z.number().describe('Number of reports returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getStockFinancials({
      ticker: ctx.input.ticker,
      timeframe: ctx.input.timeframe,
      filingDateGte: ctx.input.filingDateGte,
      filingDateLte: ctx.input.filingDateLte,
      periodOfReportDateGte: ctx.input.periodOfReportDateGte,
      periodOfReportDateLte: ctx.input.periodOfReportDateLte,
      includeSources: ctx.input.includeSources,
      order: ctx.input.order,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let rows = responseRows(data.results);
    if (!rows)
      throw createApiServiceError('Polygon.io omitted the required financial results array.');
    let reports = rows.map((r: any) => ({
      ticker: r.tickers?.[0] ?? undefined,
      cik: r.cik ?? undefined,
      companyName: r.company_name ?? undefined,
      startDate: r.start_date ?? undefined,
      endDate: r.end_date ?? undefined,
      filingDate: r.filing_date ?? undefined,
      fiscalPeriod: r.fiscal_period ?? undefined,
      fiscalYear: r.fiscal_year ?? undefined,
      sourceFilingUrl: r.source_filing_url ?? undefined,
      sourceFilingFileUrl: r.source_filing_file_url ?? undefined,
      incomeStatement: financialStatement(r.financials?.income_statement),
      balanceSheet: financialStatement(r.financials?.balance_sheet),
      cashFlowStatement: financialStatement(r.financials?.cash_flow_statement),
      comprehensiveIncome: financialStatement(r.financials?.comprehensive_income)
    }));

    return {
      output: {
        nextCursor: nextCursor(data),
        rawReports: data.results ?? undefined,
        reports,
        count: reports.length
      },
      message: `Retrieved **${reports.length}** financial report(s) for **${ctx.input.ticker}**${ctx.input.timeframe ? ` (${ctx.input.timeframe})` : ''}.`
    };
  })
  .build();
