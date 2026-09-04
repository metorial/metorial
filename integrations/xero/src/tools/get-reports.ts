import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { xeroServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let reportTypeSchema = z.enum([
  'BalanceSheet',
  'ProfitAndLoss',
  'TrialBalance',
  'BudgetSummary',
  'ExecutiveSummary',
  'BankSummary',
  'AgedReceivablesByContact',
  'AgedPayablesByContact',
  'TenNinetyNine'
]);

let getReportInputSchema = z.object({
  reportType: reportTypeSchema.describe('Type of report to generate'),
  contactId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Required Xero contact ID for AgedReceivablesByContact and AgedPayablesByContact'
    ),
  date: z.string().optional().describe('Report date (YYYY-MM-DD)'),
  fromDate: z.string().optional().describe('Start date for date-range reports (YYYY-MM-DD)'),
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
});

type GetReportInput = z.infer<typeof getReportInputSchema>;

let agedReportTypes = new Set<GetReportInput['reportType']>([
  'AgedReceivablesByContact',
  'AgedPayablesByContact'
]);

export let buildReportParams = (input: GetReportInput) => {
  if (agedReportTypes.has(input.reportType) && !input.contactId) {
    throw xeroServiceError(`contactId is required for the ${input.reportType} report.`);
  }

  let params: Record<string, string> = {};
  if (input.contactId) params.contactId = input.contactId;
  if (input.date) params.date = input.date;
  if (input.fromDate) params.fromDate = input.fromDate;
  if (input.toDate) params.toDate = input.toDate;
  if (input.periods !== undefined) params.periods = String(input.periods);
  if (input.timeframe) params.timeframe = input.timeframe;
  if (input.trackingCategoryId) params.trackingCategoryID = input.trackingCategoryId;
  if (input.trackingOptionId) params.trackingOptionID = input.trackingOptionId;
  if (input.standardLayout !== undefined) {
    params.standardLayout = String(input.standardLayout);
  }
  if (input.paymentsOnly !== undefined) {
    params.paymentsOnly = String(input.paymentsOnly);
  }

  return params;
};

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
    'AgedReceivablesByContact and AgedPayablesByContact require "contactId" and accept optional "date", "fromDate", and "toDate" parameters'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(getReportInputSchema)
  .output(reportOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let report = await client.getReport(ctx.input.reportType, buildReportParams(ctx.input));

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
