import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let exportTable = SlateTool.create(spec, {
  name: 'Export Table',
  key: 'export_table',
  description: `Request a bulk export of an entire Nasdaq Data Link table as a downloadable ZIP file. Returns a download link and the export status.
Use this for large datasets that exceed the 10,000-row pagination limit.`,
  instructions: [
    'The download link expires after 30 minutes.',
    'If the status is "creating" or "regenerating", wait a few minutes and retry to get the download link.'
  ],
  constraints: [
    'Limited to 60 bulk downloads per hour.',
    'Premium tables require an active subscription.'
  ],
  tags: {
    readOnly: true
  }
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
      downloadLink: z.string().describe('URL to download the exported ZIP file.'),
      fileStatus: z
        .string()
        .describe(
          'File status: "fresh" (ready), "creating" (in progress), or "regenerating" (outdated, new version being created).'
        ),
      snapshotTime: z.string().describe('Timestamp of the data snapshot.'),
      lastRefreshedTime: z.string().describe('Timestamp of the last data refresh.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TablesClient({ apiKey: ctx.auth.token });

    let response = await client.requestBulkExport(
      ctx.input.tablePath,
      ctx.input.filters as Record<string, string> | undefined
    );

    let file = response.datatable_bulk_download.file;
    let datatable = response.datatable_bulk_download.datatable;

    return {
      output: {
        downloadLink: file.link || '',
        fileStatus: file.status,
        snapshotTime: file.data_snapshot_time || '',
        lastRefreshedTime: datatable.last_refreshed_time || ''
      },
      message:
        file.status === 'fresh'
          ? `Export ready for **${ctx.input.tablePath}**. Download link expires in 30 minutes.`
          : `Export for **${ctx.input.tablePath}** is being generated (status: ${file.status}). Retry in a few minutes.`
    };
  })
  .build();
