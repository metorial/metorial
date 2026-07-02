import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Generates a financial report from QuickBooks. Supports standard reports including Profit and Loss, Balance Sheet, Cash Flow, Trial Balance, and more. Reports can be filtered by date range and other parameters.`,
  instructions: [
    'Common report names: ProfitAndLoss, BalanceSheet, CashFlow, TrialBalance, GeneralLedger, AgedReceivables, AgedPayables, CustomerIncome, VendorExpenses.',
    'Date filters use YYYY-MM-DD format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportName: z
        .enum([
          'ProfitAndLoss',
          'ProfitAndLossDetail',
          'BalanceSheet',
          'CashFlow',
          'TrialBalance',
          'GeneralLedger',
          'GeneralLedgerDetail',
          'AgedReceivables',
          'AgedReceivableDetail',
          'AgedPayables',
          'AgedPayableDetail',
          'CustomerIncome',
          'CustomerBalance',
          'CustomerBalanceDetail',
          'VendorBalance',
          'VendorBalanceDetail',
          'VendorExpenses',
          'TransactionList'
        ])
        .describe('Name of the report to generate'),
      startDate: z.string().optional().describe('Report start date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Report end date (YYYY-MM-DD)'),
      accountingMethod: z
        .enum(['Cash', 'Accrual'])
        .optional()
        .describe('Accounting method for the report'),
      summarizeBy: z
        .enum(['Total', 'Month', 'Week', 'Days', 'Quarter', 'Year'])
        .optional()
        .describe('How to summarize the report data'),
      customerId: z.string().optional().describe('Filter report to a specific customer'),
      vendorId: z.string().optional().describe('Filter report to a specific vendor'),
      departmentId: z.string().optional().describe('Filter report to a specific department')
    })
  )
  .output(
    z.object({
      reportName: z.string().describe('Name of the report'),
      reportBasis: z.string().optional().describe('Accounting basis used'),
      startPeriod: z.string().optional().describe('Report start period'),
      endPeriod: z.string().optional().describe('Report end period'),
      currency: z.string().optional().describe('Currency code'),
      columns: z
        .array(
          z.object({
            label: z.string(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Column definitions'),
      rows: z.array(z.any()).optional().describe('Report data rows')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let params: Record<string, string> = {};
    if (ctx.input.startDate) params.start_date = ctx.input.startDate;
    if (ctx.input.endDate) params.end_date = ctx.input.endDate;
    if (ctx.input.accountingMethod) params.accounting_method = ctx.input.accountingMethod;
    if (ctx.input.summarizeBy) params.summarize_column_by = ctx.input.summarizeBy;
    if (ctx.input.customerId) params.customer = ctx.input.customerId;
    if (ctx.input.vendorId) params.vendor = ctx.input.vendorId;
    if (ctx.input.departmentId) params.department = ctx.input.departmentId;

    let report = await client.getReport(ctx.input.reportName, params);

    let header = report?.Header ?? {};
    let columns = (report?.Columns?.Column ?? []).map((col: any) => ({
      label: col.ColTitle,
      type: col.ColType
    }));

    let rows = extractRows(report?.Rows?.Row ?? []);

    return {
      output: {
        reportName: header.ReportName ?? ctx.input.reportName,
        reportBasis: header.ReportBasis,
        startPeriod: header.StartPeriod,
        endPeriod: header.EndPeriod,
        currency: header.Currency,
        columns,
        rows
      },
      message: `Generated **${header.ReportName ?? ctx.input.reportName}** report${header.StartPeriod ? ` for ${header.StartPeriod} to ${header.EndPeriod}` : ''}.`
    };
  })
  .build();

let extractRows = (rows: any[]): any[] => {
  return rows.map((row: any) => {
    let result: any = {};

    if (row.ColData) {
      result.values = row.ColData.map((col: any) => col.value);
    }

    if (row.Header?.ColData) {
      result.header = row.Header.ColData.map((col: any) => col.value);
    }

    if (row.Summary?.ColData) {
      result.summary = row.Summary.ColData.map((col: any) => col.value);
    }

    if (row.Rows?.Row) {
      result.children = extractRows(row.Rows.Row);
    }

    if (row.group) {
      result.group = row.group;
    }

    return result;
  });
};
