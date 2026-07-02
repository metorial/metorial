import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let financialEntrySchema = z.object({
  fiscalDateEnding: z.string().describe('End date of the fiscal period'),
  reportedCurrency: z.string().describe('Currency of the reported values'),
  fields: z
    .record(z.string(), z.string())
    .describe('Key-value pairs of financial line items and their values')
});

export let getFinancialStatements = SlateTool.create(spec, {
  name: 'Get Financial Statements',
  key: 'get_financial_statements',
  description: `Retrieve financial statements for a US-listed company. Supports income statements, balance sheets, and cash flow statements in both annual and quarterly granularity. Returns all line items reported by the company.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Stock ticker symbol, e.g. "AAPL"'),
      statementType: z
        .enum(['income_statement', 'balance_sheet', 'cash_flow'])
        .describe('Type of financial statement to retrieve'),
      period: z
        .enum(['annual', 'quarterly'])
        .optional()
        .default('annual')
        .describe('Reporting period granularity')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Ticker symbol'),
      statementType: z.string().describe('Type of financial statement'),
      reports: z.array(financialEntrySchema).describe('Financial reports, most recent first')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { symbol, statementType, period } = ctx.input;

    let data: any;
    if (statementType === 'income_statement') {
      data = await client.incomeStatement({ symbol });
    } else if (statementType === 'balance_sheet') {
      data = await client.balanceSheet({ symbol });
    } else {
      data = await client.cashFlow({ symbol });
    }

    let reportsKey = period === 'annual' ? 'annualReports' : 'quarterlyReports';
    let rawReports: any[] = data[reportsKey] || [];

    let reports = rawReports.map((report: any) => {
      let { fiscalDateEnding, reportedCurrency, ...fields } = report;
      let stringFields: Record<string, string> = {};
      for (let [key, value] of Object.entries(fields)) {
        stringFields[key] = String(value ?? '');
      }
      return {
        fiscalDateEnding: fiscalDateEnding || '',
        reportedCurrency: reportedCurrency || '',
        fields: stringFields
      };
    });

    let label = statementType.replace(/_/g, ' ');
    return {
      output: {
        symbol,
        statementType,
        reports
      },
      message: `Retrieved ${reports.length} ${period} ${label} report(s) for **${symbol}**.`
    };
  })
  .build();
