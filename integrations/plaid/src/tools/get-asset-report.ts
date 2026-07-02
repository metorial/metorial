import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let getAssetReportTool = SlateTool.create(spec, {
  name: 'Get Asset Report',
  key: 'get_asset_report',
  description: `Retrieve a completed Asset Report by its token. The report contains account details, historical balances, and transaction summaries across all included Items. Call this after receiving the PRODUCT_READY webhook or after waiting for the report to be generated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assetReportToken: z.string().describe('Asset report token from the create call')
    })
  )
  .output(
    z.object({
      assetReportId: z.string().describe('Report ID'),
      generatedAt: z.string().describe('ISO 8601 timestamp when the report was generated'),
      daysRequested: z.number().describe('Number of days of history in the report'),
      report: z
        .any()
        .describe('Full asset report data including accounts, balances, and transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.getAssetReport(ctx.input.assetReportToken);
    let report = result.report;

    return {
      output: {
        assetReportId: report?.asset_report_id ?? '',
        generatedAt: report?.date_generated ?? '',
        daysRequested: report?.days_requested ?? 0,
        report
      },
      message: `Retrieved asset report \`${report?.asset_report_id}\` generated at ${report?.date_generated}.`
    };
  })
  .build();
