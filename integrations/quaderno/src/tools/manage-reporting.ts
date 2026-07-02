import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let reportRequestOutputSchema = z.object({
  requestId: z.string().optional().describe('Report request ID'),
  reportType: z.string().optional().describe('Type of report'),
  state: z
    .string()
    .optional()
    .describe('Report state (e.g., "pending", "completed", "failed")'),
  parameters: z.any().optional().describe('Report parameters'),
  downloadUrl: z.string().optional().describe('URL to download the completed report'),
  createdAt: z.string().optional().describe('Report request creation time')
});

export let createReport = SlateTool.create(spec, {
  name: 'Request Tax Report',
  key: 'request_tax_report',
  description: `Request a tax report from Quaderno. Reports are generated asynchronously. Use the "Get Report Status" tool to check when it is ready and retrieve the download URL.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      reportType: z.string().describe('Type of report (e.g., "tax_summary", "quarterly")'),
      startDate: z.string().optional().describe('Report start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('Report end date in YYYY-MM-DD format'),
      country: z.string().optional().describe('Country code to filter the report'),
      region: z.string().optional().describe('Region/state to filter the report')
    })
  )
  .output(reportRequestOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      report_type: ctx.input.reportType
    };
    if (ctx.input.startDate) data.start_date = ctx.input.startDate;
    if (ctx.input.endDate) data.end_date = ctx.input.endDate;
    if (ctx.input.country) data.country = ctx.input.country;
    if (ctx.input.region) data.region = ctx.input.region;

    let r = await client.createReportRequest(data);

    return {
      output: {
        requestId: r.id?.toString(),
        reportType: r.report_type,
        state: r.state,
        parameters: r.parameters,
        downloadUrl: r.download_url,
        createdAt: r.created_at
      },
      message: `Requested **${ctx.input.reportType}** report — Status: **${r.state || 'pending'}**`
    };
  })
  .build();

export let getReportStatus = SlateTool.create(spec, {
  name: 'Get Report Status',
  key: 'get_report_status',
  description: `Check the status of a previously requested tax report. When completed, provides a download URL for the report.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      requestId: z.string().describe('ID of the report request to check')
    })
  )
  .output(reportRequestOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let r = await client.getReportRequest(ctx.input.requestId);

    return {
      output: {
        requestId: r.id?.toString(),
        reportType: r.report_type,
        state: r.state,
        parameters: r.parameters,
        downloadUrl: r.download_url,
        createdAt: r.created_at
      },
      message:
        r.state === 'completed'
          ? `Report **${ctx.input.requestId}** is **completed**${r.download_url ? ` — [Download](${r.download_url})` : ''}`
          : `Report **${ctx.input.requestId}** is **${r.state || 'pending'}**`
    };
  })
  .build();
