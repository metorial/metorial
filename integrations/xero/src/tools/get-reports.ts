import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let reportCellSchema = z.object({
  value: z.string().optional().describe('Cell value'),
  accountId: z.string().optional().describe('Account ID if applicable')
});

let reportRowSchema: any = z.object({
  rowType: z.string().optional().describe('Row type: Header, Section, Row, SummaryRow'),
  title: z.string().optional().describe('Section title'),
  cells: z.array(reportCellSchema).optional().describe('Cell values'),
  rows: z.array(z.any()).optional().describe('Nested rows within a section')
});

let reportOutputSchema = z.object({
  reportName: z.string().optional().describe('Report name'),
  reportTitle: z.string().optional().describe('Report title including date range'),
  reportDate: z.string().optional().describe('Report date'),
  updatedDate: z.string().optional().describe('When the report was generated'),
  rows: z
    .array(reportRowSchema)
    .optional()
    .describe('Report rows with headers, sections, and data')
});

let mapReportRow = (row: any): any => ({
  rowType: row.RowType,
  title: row.Title,
  cells: row.Cells?.map((c: any) => ({
    value: c.Value,
    accountId: c.Attributes?.find((a: any) => a.Id === 'account')?.Value
  })),
  rows: row.Rows?.map(mapReportRow)
});

export let getReport = SlateTool.create(spec, {
  name: 'Get Financial Report',
  key: 'get_report',
  description: `Generates a financial report from Xero. Supports Balance Sheet, Profit and Loss, Trial Balance, Budget Summary, Executive Summary, Bank Summary, Aged Receivables, Aged Payables, and more. Reports are generated in real-time from your Xero data.`,
  instructions: [
    'Available report types: BalanceSheet, ProfitAndLoss, TrialBalance, BudgetSummary, ExecutiveSummary, BankSummary, AgedReceivablesByContact, AgedPayablesByContact, TenNinetyNine',
    'Date parameters use YYYY-MM-DD format',
    'Most reports accept a "date" parameter for the reporting date',
    'Profit and Loss accepts "fromDate" and "toDate" for a date range',
    'Aged reports accept "date" and optionally "fromDate" and "toDate"'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      reportType: z
        .enum([
          'BalanceSheet',
          'ProfitAndLoss',
          'TrialBalance',
          'BudgetSummary',
          'ExecutiveSummary',
          'BankSummary',
          'AgedReceivablesByContact',
          'AgedPayablesByContact',
          'TenNinetyNine'
        ])
        .describe('Type of report to generate'),
      date: z.string().optional().describe('Report date (YYYY-MM-DD)'),
      fromDate: z
        .string()
        .optional()
        .describe('Start date for date-range reports (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('End date for date-range reports (YYYY-MM-DD)'),
      periods: z
        .number()
        .optional()
        .describe('Number of periods to compare (for comparative reports)'),
      timeframe: z
        .enum(['MONTH', 'QUARTER', 'YEAR'])
        .optional()
        .describe('Period timeframe for comparative reports'),
      trackingCategoryId: z.string().optional().describe('Tracking category ID for filtering'),
      trackingOptionId: z.string().optional().describe('Tracking option ID for filtering'),
      standardLayout: z
        .boolean()
        .optional()
        .describe('Use standard layout (true) or payday layout (false)'),
      paymentsOnly: z.boolean().optional().describe('Show payments only in the report')
    })
  )
  .output(reportOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let params: Record<string, string> = {};
    if (ctx.input.date) params.date = ctx.input.date;
    if (ctx.input.fromDate) params.fromDate = ctx.input.fromDate;
    if (ctx.input.toDate) params.toDate = ctx.input.toDate;
    if (ctx.input.periods !== undefined) params.periods = String(ctx.input.periods);
    if (ctx.input.timeframe) params.timeframe = ctx.input.timeframe;
    if (ctx.input.trackingCategoryId) params.trackingCategoryID = ctx.input.trackingCategoryId;
    if (ctx.input.trackingOptionId) params.trackingOptionID = ctx.input.trackingOptionId;
    if (ctx.input.standardLayout !== undefined)
      params.standardLayout = String(ctx.input.standardLayout);
    if (ctx.input.paymentsOnly !== undefined)
      params.paymentsOnly = String(ctx.input.paymentsOnly);

    let report = await client.getReport(ctx.input.reportType, params);

    let output = {
      reportName: report.ReportName,
      reportTitle: report.ReportTitle,
      reportDate: report.ReportDate,
      updatedDate: report.UpdatedDateUTC,
      rows: report.Rows?.map(mapReportRow)
    };

    return {
      output,
      message: `Generated **${output.reportTitle || output.reportName || ctx.input.reportType}** report${output.reportDate ? ` as of ${output.reportDate}` : ''}.`
    };
  })
  .build();
