import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getStockFinancials = SlateTool.create(spec, {
  name: 'Get Stock Financials',
  key: 'get_stock_financials',
  description: `Retrieve financial data from SEC filings for a stock ticker, including balance sheets, income statements, and cash flow statements. Data is sourced from SEC EDGAR filings.`,
  instructions: ['This endpoint uses the experimental vX API and may change.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticker: z.string().describe('Stock ticker symbol (e.g., AAPL)'),
      period: z.enum(['annual', 'quarterly', 'ttm']).optional().describe('Filing period type'),
      timeframe: z
        .enum(['annual', 'quarterly', 'ttm'])
        .optional()
        .describe('Timeframe of the financials'),
      filingDateFrom: z.string().optional().describe('Minimum filing date (YYYY-MM-DD)'),
      filingDateTo: z.string().optional().describe('Maximum filing date (YYYY-MM-DD)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().int().optional().describe('Max number of results'),
      sort: z.string().optional().describe('Field to sort by')
    })
  )
  .output(
    z.object({
      filings: z
        .array(
          z.object({
            ticker: z.string().optional().describe('Stock ticker'),
            companyName: z.string().optional().describe('Company name'),
            cik: z.string().optional().describe('SEC CIK number'),
            startDate: z.string().optional().describe('Period start date'),
            endDate: z.string().optional().describe('Period end date'),
            filingDate: z.string().optional().describe('SEC filing date'),
            fiscalPeriod: z.string().optional().describe('Fiscal period (e.g., Q1, FY)'),
            fiscalYear: z.string().optional().describe('Fiscal year'),
            sourceFilingUrl: z.string().optional().describe('URL to the SEC filing'),
            financials: z
              .any()
              .optional()
              .describe(
                'Financial data (balance_sheet, income_statement, cash_flow_statement, comprehensive_income)'
              )
          })
        )
        .describe('Financial filings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let response = await client.getStockFinancials({
      ticker: ctx.input.ticker,
      period: ctx.input.period,
      timeframe: ctx.input.timeframe,
      filingDateGte: ctx.input.filingDateFrom,
      filingDateLte: ctx.input.filingDateTo,
      order: ctx.input.order,
      limit: ctx.input.limit,
      sort: ctx.input.sort
    });

    let filings = (response.results || []).map((r: any) => ({
      ticker: r.tickers?.[0],
      companyName: r.company_name,
      cik: r.cik,
      startDate: r.start_date,
      endDate: r.end_date,
      filingDate: r.filing_date,
      fiscalPeriod: r.fiscal_period,
      fiscalYear: r.fiscal_year,
      sourceFilingUrl: r.source_filing_url,
      financials: r.financials
    }));

    return {
      output: { filings },
      message: `Retrieved **${filings.length}** financial filing(s) for **${ctx.input.ticker}**.`
    };
  })
  .build();
