import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { bigQueryServiceError } from '../lib/errors';
import { spec } from '../spec';

export let readTableData = SlateTool.create(spec, {
  name: 'Read Table Data',
  key: 'read_table_data',
  description: `Read rows directly from a BigQuery table without running a query job. Useful for quickly inspecting table contents. For complex filtering or aggregation, use **Execute SQL Query** instead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('Dataset containing the table'),
      tableId: z.string().describe('Table to read rows from'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of rows to return (default 100)'),
      pageToken: z.string().optional().describe('Page token for paginated results'),
      startIndex: z.string().optional().describe('Zero-based row index to start reading from'),
      selectedFields: z
        .string()
        .optional()
        .describe('Comma-separated list of columns to return')
    })
  )
  .output(
    z.object({
      totalRows: z.string(),
      rows: z.array(z.any()),
      pageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let result = await client.listTableData(ctx.input.datasetId, ctx.input.tableId, {
      maxResults: ctx.input.maxResults || 100,
      pageToken: ctx.input.pageToken,
      startIndex: ctx.input.startIndex,
      selectedFields: ctx.input.selectedFields
    });

    return {
      output: {
        totalRows: result.totalRows,
        rows: result.rows || [],
        pageToken: result.pageToken
      },
      message: `Returned **${(result.rows || []).length}** of **${result.totalRows}** total rows from **${ctx.input.datasetId}.${ctx.input.tableId}**.`
    };
  })
  .build();

export let insertRows = SlateTool.create(spec, {
  name: 'Insert Rows (Streaming)',
  key: 'insert_rows',
  description: `Stream rows into a BigQuery table using the streaming insert API. Rows are available for querying almost immediately. Each row is a JSON object matching the table schema. Optionally provide an insertId per row for best-effort deduplication.`,
  instructions: [
    'Row field names must match the table schema exactly.',
    'Streaming inserts are not free; they incur per-byte costs.',
    'Streamed data cannot be updated or deleted for a short buffer period.'
  ],
  constraints: [
    'Maximum 50,000 rows per request.',
    'Maximum 10 MB per request.',
    'Rows become available for queries within a few seconds, but may take up to 90 minutes before they are available for table copy/export.'
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
      rows: z
        .array(
          z.object({
            insertId: z.string().optional().describe('Unique ID for deduplication'),
            json: z
              .record(z.string(), z.any())
              .describe('Row data as key-value pairs matching the table schema')
          })
        )
        .describe('Rows to insert'),
      skipInvalidRows: z
        .boolean()
        .optional()
        .describe('Insert valid rows even if some are invalid'),
      ignoreUnknownValues: z
        .boolean()
        .optional()
        .describe('Accept rows with values not matching the schema'),
      templateSuffix: z
        .string()
        .optional()
        .describe('Append suffix to table name for template tables')
    })
  )
  .output(
    z.object({
      insertedCount: z.number(),
      insertErrors: z
        .array(
          z.object({
            rowIndex: z.number(),
            errors: z.array(z.any())
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let result = await client.insertTableData(
      ctx.input.datasetId,
      ctx.input.tableId,
      ctx.input.rows,
      {
        skipInvalidRows: ctx.input.skipInvalidRows,
        ignoreUnknownValues: ctx.input.ignoreUnknownValues,
        templateSuffix: ctx.input.templateSuffix
      }
    );

    let insertErrors = result.insertErrors?.map((e: any) => ({
      rowIndex: e.index,
      errors: e.errors
    }));

    let errorCount = insertErrors?.length || 0;
    let insertedCount = ctx.input.rows.length - errorCount;

    if (errorCount > 0 && ctx.input.skipInvalidRows !== true) {
      let serviceError = bigQueryServiceError(
        `BigQuery rejected ${errorCount} row(s) for ${ctx.input.datasetId}.${ctx.input.tableId}.`
      );
      serviceError.data.reason = 'bigquery_insert_rows_failed';
      serviceError.data.insertErrors = insertErrors;
      serviceError.data.insertedCount = insertedCount;
      throw serviceError;
    }

    return {
      output: {
        insertedCount,
        insertErrors
      },
      message: `Inserted **${insertedCount}** of **${ctx.input.rows.length}** rows into **${ctx.input.datasetId}.${ctx.input.tableId}**.${errorCount > 0 ? ` **${errorCount}** row(s) had errors.` : ''}`
    };
  })
  .build();

export let copyTable = SlateTool.create(spec, {
  name: 'Copy Table',
  key: 'copy_table',
  description: `Copy a BigQuery table to another table, within the same dataset or across datasets and projects. Creates an asynchronous copy job.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceDatasetId: z.string().describe('Source dataset'),
      sourceTableId: z.string().describe('Source table'),
      sourceProjectId: z
        .string()
        .optional()
        .describe('Source project (defaults to configured project)'),
      destinationDatasetId: z.string().describe('Destination dataset'),
      destinationTableId: z.string().describe('Destination table'),
      destinationProjectId: z
        .string()
        .optional()
        .describe('Destination project (defaults to configured project)'),
      writeDisposition: z
        .enum(['WRITE_TRUNCATE', 'WRITE_APPEND', 'WRITE_EMPTY'])
        .optional()
        .describe('How to handle existing destination table data')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      state: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let job = await client.createCopyJob({
      sourceDatasetId: ctx.input.sourceDatasetId,
      sourceTableId: ctx.input.sourceTableId,
      sourceProjectId: ctx.input.sourceProjectId,
      destinationDatasetId: ctx.input.destinationDatasetId,
      destinationTableId: ctx.input.destinationTableId,
      destinationProjectId: ctx.input.destinationProjectId,
      writeDisposition: ctx.input.writeDisposition
    });

    let jobId = job.jobReference.jobId;

    return {
      output: {
        jobId,
        state: job.status?.state || 'PENDING'
      },
      message: `Copy job **${jobId}** created. Copying **${ctx.input.sourceDatasetId}.${ctx.input.sourceTableId}** to **${ctx.input.destinationDatasetId}.${ctx.input.destinationTableId}**.`
    };
  })
  .build();
