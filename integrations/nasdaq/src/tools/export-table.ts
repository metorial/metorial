import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { exportDownloadUrl, exportRefreshAt } from '../lib/export';
import { spec } from '../spec';

export let exportTable = SlateTool.create(spec, {
  name: 'Export Table',
  key: 'export_table',
  description:
    'Request a bulk ZIP export of a Nasdaq Data Link table or filtered subset. Returns export status and a downloadable file when generation completes.',
  instructions: [
    'If the export is not fresh, wait and retry with the same table and filters. Download links can expire; request the export again if necessary.'
  ],
  constraints: ['Premium tables require an active subscription.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      tablePath: z
        .string()
        .describe('Table path in the format PUBLISHER/TABLE_CODE (e.g., ZACKS/FC).'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Optional row-level filters to apply to the export.')
    })
  )
  .output(
    z.object({
      downloadLink: z.string().optional().describe('Provider download URL, when available.'),
      fileStatus: z
        .string()
        .describe('Provider export status, such as fresh, creating, or regenerating.'),
      snapshotTime: z.string().optional().describe('Data snapshot timestamp, when supplied.'),
      lastRefreshedTime: z
        .string()
        .optional()
        .describe('Last data refresh timestamp, when supplied.'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Original export metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TablesClient({ apiKey: ctx.auth.token, authMethod: ctx.auth.authMethod });
    let response = await client.requestBulkExport(ctx.input.tablePath, ctx.input.filters);
    let file = response.datatable_bulk_download.file;
    let datatable = response.datatable_bulk_download.datatable;
    if (file.status === 'fresh') {
      let url = exportDownloadUrl(file);
      await ctx.addAttachment({
        type: 'url',
        url,
        mimeType: 'application/zip',
        refreshReference: { tablePath: ctx.input.tablePath, filters: ctx.input.filters },
        refreshAt: exportRefreshAt(url)
      });
    }
    return {
      output: {
        ...(file.link ? { downloadLink: file.link } : {}),
        fileStatus: file.status,
        ...(file.data_snapshot_time != null ? { snapshotTime: file.data_snapshot_time } : {}),
        ...(datatable?.last_refreshed_time != null
          ? { lastRefreshedTime: datatable.last_refreshed_time }
          : {}),
        raw: response
      },
      message:
        file.status === 'fresh'
          ? `Export ready for **${ctx.input.tablePath}**.`
          : `Export for **${ctx.input.tablePath}** has status **${file.status}**. Retry after generation completes.`
    };
  })
  .build();
