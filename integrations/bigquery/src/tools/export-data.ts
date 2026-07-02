import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

export let exportData = SlateTool.create(spec, {
  name: 'Export Table to Cloud Storage',
  key: 'export_data',
  description: `Export a BigQuery table to Google Cloud Storage as CSV, JSON, or Avro. Creates an asynchronous extract job. Use wildcards in the destination URI for sharded exports of large tables (e.g., gs://bucket/file-*.csv).`,
  instructions: [
    'Destination URIs must use the gs:// scheme.',
    'For large tables, use a wildcard (*) in the URI to export to multiple files.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Source dataset'),
      tableId: z.string().describe('Source table to export'),
      destinationUris: z
        .array(z.string())
        .describe('Cloud Storage destination URIs (gs://bucket/path)'),
      destinationFormat: z
        .enum(['CSV', 'NEWLINE_DELIMITED_JSON', 'AVRO'])
        .optional()
        .describe('Export format (default CSV)'),
      compression: z
        .enum(['NONE', 'GZIP', 'DEFLATE', 'SNAPPY', 'ZSTD'])
        .optional()
        .describe('Compression type (default NONE)'),
      fieldDelimiter: z.string().optional().describe('Field delimiter for CSV exports'),
      printHeader: z
        .boolean()
        .optional()
        .describe('Whether to include a header row in CSV exports (default true)')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      state: z.string(),
      creationTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let job = await client.createExtractJob({
      datasetId: ctx.input.datasetId,
      tableId: ctx.input.tableId,
      destinationUris: ctx.input.destinationUris,
      destinationFormat: ctx.input.destinationFormat,
      compression: ctx.input.compression,
      fieldDelimiter: ctx.input.fieldDelimiter,
      printHeader: ctx.input.printHeader
    });

    let jobId = job.jobReference.jobId;

    return {
      output: {
        jobId,
        state: job.status?.state || 'PENDING',
        creationTime: job.statistics?.creationTime
      },
      message: `Export job **${jobId}** created. Exporting **${ctx.input.datasetId}.${ctx.input.tableId}** to ${ctx.input.destinationUris.join(', ')}.`
    };
  })
  .build();
