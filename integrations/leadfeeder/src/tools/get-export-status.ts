import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let getExportStatus = SlateTool.create(spec, {
  name: 'Get Export Status',
  key: 'get_export_status',
  description: `Check the status of a previously submitted lead export request. Returns the current status and download URL when the export is processed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      exportId: z.string().describe('The export request ID returned by Export Leads')
    })
  )
  .output(
    z.object({
      exportId: z.string(),
      status: z.string().describe('Current status: pending, processed, or failed'),
      createdAt: z.string(),
      statusUrl: z.string(),
      downloadUrl: z
        .string()
        .describe('URL to download the report (available when status is processed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);
    let exportStatus = await client.getExportStatus(ctx.input.exportId);

    return {
      output: exportStatus,
      message: `Export **${exportStatus.exportId}** status: **${exportStatus.status}**.${exportStatus.status === 'processed' ? ` Download available at: ${exportStatus.downloadUrl}` : ''}`
    };
  })
  .build();
