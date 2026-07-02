import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  description: `Retrieve financial reports (10-K and 10-Q) for US companies. Includes income statements, balance sheets, cash flow statements, and comprehensive income data sourced from SEC Edgar.`,
  instructions: ['Use timeframe "annual" for 10-K reports and "quarterly" for 10-Q reports.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
      limit: ctx.input.limit
    });

    let reports = (data.results || []).map((r: any) => ({
      ticker: r.tickers?.[0] || ctx.input.ticker,
      cik: r.cik,
      companyName: r.company_name,
      startDate: r.start_date,
      endDate: r.end_date,
      filingDate: r.filing_date,
      fiscalPeriod: r.fiscal_period,
      fiscalYear: r.fiscal_year,
      sourceFilingUrl: r.source_filing_url,
      sourceFilingFileUrl: r.source_filing_file_url,
      incomeStatement: r.financials?.income_statement,
      balanceSheet: r.financials?.balance_sheet,
      cashFlowStatement: r.financials?.cash_flow_statement,
      comprehensiveIncome: r.financials?.comprehensive_income
    }));

    return {
      output: {
        reports,
        count: reports.length
      },
      message: `Retrieved **${reports.length}** financial report(s) for **${ctx.input.ticker}**${ctx.input.timeframe ? ` (${ctx.input.timeframe})` : ''}.`
    };
  })
  .build();
