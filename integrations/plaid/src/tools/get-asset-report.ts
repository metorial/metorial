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
      assetReportToken: z.string().describe('Asset report token from the create call'),
      format: z
        .enum(['json', 'pdf'])
        .default('json')
        .describe(
          'Return structured data; optionally also download the existing report as a PDF'
        )
    })
  )
  .output(
    z.object({
      assetReportId: z.string().describe('Report ID'),
      generatedAt: z.string().describe('ISO 8601 timestamp when the report was generated'),
      daysRequested: z.number().describe('Number of days of history in the report'),
      report: z
        .any()
        .describe('Full asset report data including accounts, balances, and transactions'),
      fileName: z.string().optional().describe('PDF filename when requested'),
      mimeType: z.string().optional().describe('PDF MIME type when requested'),
      size: z.number().optional().describe('PDF size in bytes when requested')
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
    let file: { fileName: string; mimeType: string; size: number } | undefined;
    if (ctx.input.format === 'pdf') {
      const bytes = await client.getAssetReportPdf(ctx.input.assetReportToken);
      const fileName = `asset-report-${report.asset_report_id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100)}.pdf`;
      const mimeType = 'application/pdf';
      await ctx.addAttachment({
        type: 'content',
        filename: fileName,
        mimeType,
        content: new Response(Buffer.from(bytes), { headers: { 'content-type': mimeType } })
      });
      file = { fileName, mimeType, size: bytes.byteLength };
    }

    return {
      output: {
        assetReportId: report.asset_report_id,
        generatedAt: report.date_generated,
        daysRequested: report.days_requested,
        report,
        ...file
      },
      message: `Retrieved asset report \`${report.asset_report_id}\` generated at ${report.date_generated}.`
    };
  })
  .build();
