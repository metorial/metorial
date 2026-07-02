import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

export let loadData = SlateTool.create(spec, {
  name: 'Load Data from Cloud Storage',
  key: 'load_data',
  description: `Load data from Google Cloud Storage into a BigQuery table. Supports CSV, JSON (newline-delimited), Avro, Parquet, ORC, Datastore, and Firestore export formats. Creates an asynchronous load job and returns the job status.`,
  instructions: [
    'Source URIs must use the gs:// scheme (e.g., gs://bucket/path/file.csv).',
    'Wildcards are supported in URIs (e.g., gs://bucket/path/*.csv).',
    'Set autodetect=true to have BigQuery infer the schema from the source data.',
    'For CSV files, you can configure delimiters, quoting, and header rows.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Target dataset'),
      tableId: z.string().describe('Target table'),
      sourceUris: z
        .array(z.string())
        .describe('Cloud Storage URIs to load from (gs://bucket/path)'),
      sourceFormat: z
        .enum([
          'CSV',
          'NEWLINE_DELIMITED_JSON',
          'AVRO',
          'PARQUET',
          'ORC',
          'DATASTORE_BACKUP',
          'GOOGLE_SHEETS'
        ])
        .describe('Format of the source data'),
      writeDisposition: z
        .enum(['WRITE_TRUNCATE', 'WRITE_APPEND', 'WRITE_EMPTY'])
        .optional()
        .describe('How to handle existing table data'),
      createDisposition: z
        .enum(['CREATE_IF_NEEDED', 'CREATE_NEVER'])
        .optional()
        .describe('Whether to create the table if it does not exist'),
      autodetect: z
        .boolean()
        .optional()
        .describe('Automatically infer schema from the source data'),
      schema: z
        .object({
          fields: z.array(
            z.object({
              name: z.string(),
              type: z.string(),
              mode: z.string().optional(),
              description: z.string().optional()
            })
          )
        })
        .optional()
        .describe('Explicit schema definition (alternative to autodetect)'),
      skipLeadingRows: z
        .number()
        .optional()
        .describe('Number of header rows to skip (CSV only)'),
      maxBadRecords: z
        .number()
        .optional()
        .describe('Maximum number of bad records allowed before the job fails'),
      fieldDelimiter: z
        .string()
        .optional()
        .describe('Field delimiter for CSV files (default comma)'),
      allowJaggedRows: z
        .boolean()
        .optional()
        .describe('Allow rows with missing trailing columns (CSV only)'),
      allowQuotedNewlines: z
        .boolean()
        .optional()
        .describe('Allow quoted newlines in CSV fields'),
      ignoreUnknownValues: z
        .boolean()
        .optional()
        .describe('Ignore extra values not in the schema')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      state: z.string(),
      creationTime: z.string().optional(),
      errors: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let job = await client.createLoadJob({
      datasetId: ctx.input.datasetId,
      tableId: ctx.input.tableId,
      sourceUris: ctx.input.sourceUris,
      sourceFormat: ctx.input.sourceFormat,
      writeDisposition: ctx.input.writeDisposition,
      createDisposition: ctx.input.createDisposition,
      autodetect: ctx.input.autodetect,
      schema: ctx.input.schema,
      skipLeadingRows: ctx.input.skipLeadingRows,
      maxBadRecords: ctx.input.maxBadRecords,
      fieldDelimiter: ctx.input.fieldDelimiter,
      allowJaggedRows: ctx.input.allowJaggedRows,
      allowQuotedNewlines: ctx.input.allowQuotedNewlines,
      ignoreUnknownValues: ctx.input.ignoreUnknownValues
    });

    let jobId = job.jobReference.jobId;

    return {
      output: {
        jobId,
        state: job.status?.state || 'PENDING',
        creationTime: job.statistics?.creationTime,
        errors: job.status?.errors
      },
      message: `Load job **${jobId}** created (state: ${job.status?.state || 'PENDING'}). Loading data into **${ctx.input.datasetId}.${ctx.input.tableId}** from ${ctx.input.sourceUris.length} source URI(s).`
    };
  })
  .build();
