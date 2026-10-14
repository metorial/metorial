import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let downloadExport = SlateTool.create(spec, {
  name: 'Download Export',
  key: 'download_export',
  description:
    'Retrieve a downloadable JSON lead report for an existing completed export. Use export_leads to create an export and get_export_status to check progress.',
  tags: { readOnly: true }
})
  .input(z.object({ exportId: z.string().describe('Export request ID from export_leads.') }))
  .output(
    z.object({
      exportId: z.string(),
      status: z.string(),
      createdAt: z.string(),
      statusUrl: z.string(),
      downloadUrl: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);
    let report = await client.getExportStatus(ctx.input.exportId);
    if (report.status !== 'processed' || !report.downloadUrl) {
      throw createApiServiceError(
        `Export ${report.exportId} is not ready to download (status: ${report.status}). Check get_export_status before downloading.`
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: report.downloadUrl,
      mimeType: 'application/json'
    });
    return {
      output: report,
      message: `Prepared the JSON lead report for export **${report.exportId}** for download.`
    };
  })
  .build();
