import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Run an ERPNext report and retrieve its data. Supports both standard and custom reports. Useful for extracting financial summaries, stock balances, sales analytics, and other reporting data.`,
  instructions: [
    'Report names are case-sensitive and must match the exact report name in ERPNext.',
    'Filters vary by report — check the report configuration for available filter fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportName: z
        .string()
        .describe('The name of the report to run (e.g., "General Ledger", "Stock Balance")'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Report-specific filters as key-value pairs')
    })
  )
  .output(
    z.object({
      columns: z.array(z.any()).optional().describe('Report column definitions'),
      result: z.array(z.any()).optional().describe('Report data rows'),
      reportSummary: z.any().optional().describe('Summary data if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let reportData = await client.getReportData(ctx.input.reportName, ctx.input.filters);

    return {
      output: {
        columns: reportData?.columns,
        result: reportData?.result,
        reportSummary: reportData?.report_summary
      },
      message: `Generated report: **${ctx.input.reportName}** with ${reportData?.result?.length || 0} rows`
    };
  })
  .build();
