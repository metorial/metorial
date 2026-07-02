import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { spec } from '../spec';

let queryParameterSchema = z.object({
  name: z.string().describe('Parameter name'),
  parameterType: z
    .object({
      type: z
        .string()
        .describe('BigQuery type (STRING, INT64, FLOAT64, BOOL, TIMESTAMP, DATE, etc.)')
    })
    .describe('Parameter type'),
  parameterValue: z
    .object({
      value: z.string().optional().describe('Scalar value'),
      arrayValues: z
        .array(z.object({ value: z.string() }))
        .optional()
        .describe('Array values')
    })
    .describe('Parameter value')
});

export let executeQuery = SlateTool.create(spec, {
  name: 'Execute SQL Query',
  key: 'execute_query',
  description: `Run a GoogleSQL (standard SQL) query against BigQuery. Supports SELECT, DML (INSERT, UPDATE, DELETE, MERGE), and DDL (CREATE, ALTER, DROP) statements. The query is submitted as a job, polled for completion, and results are returned.
Parameterized queries are supported for safe value interpolation. You can optionally write results to a destination table.`,
  instructions: [
    'Use standard GoogleSQL syntax, not legacy SQL.',
    'For parameterized queries, set parameterMode to "NAMED" and provide queryParameters with matching @param_name references in the query.',
    'Use dryRun=true to validate and estimate costs without executing.',
    'Set maximumBytesBilled to limit query costs.'
  ],
  constraints: [
    'Query results are limited to maxResults rows per response (default 1000).',
    'The job is polled for up to 120 seconds before timing out.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      query: z.string().describe('GoogleSQL query to execute'),
      defaultDatasetId: z
        .string()
        .optional()
        .describe('Default dataset for unqualified table names'),
      destinationDatasetId: z
        .string()
        .optional()
        .describe('Dataset for writing query results to a destination table'),
      destinationTableId: z.string().optional().describe('Table for writing query results'),
      writeDisposition: z
        .enum(['WRITE_TRUNCATE', 'WRITE_APPEND', 'WRITE_EMPTY'])
        .optional()
        .describe('How to handle existing destination table data'),
      priority: z
        .enum(['INTERACTIVE', 'BATCH'])
        .optional()
        .describe('Query execution priority'),
      maximumBytesBilled: z
        .string()
        .optional()
        .describe('Maximum bytes billed limit to control costs'),
      dryRun: z
        .boolean()
        .optional()
        .describe('If true, validates the query and returns cost estimate without executing'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of result rows to return (default 1000)'),
      parameterMode: z
        .enum(['NAMED', 'POSITIONAL'])
        .optional()
        .describe('Query parameter mode'),
      queryParameters: z
        .array(queryParameterSchema)
        .optional()
        .describe('Query parameters for parameterized queries'),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Labels to apply to the query job')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('BigQuery job ID'),
      jobComplete: z.boolean().describe('Whether the job completed successfully'),
      totalRows: z.string().optional().describe('Total number of rows in the result'),
      totalBytesProcessed: z
        .string()
        .optional()
        .describe('Total bytes processed by the query'),
      cacheHit: z
        .boolean()
        .optional()
        .describe('Whether the query result was served from cache'),
      schema: z.any().optional().describe('Schema of the result set'),
      rows: z.array(z.any()).optional().describe('Result rows as field-value pairs'),
      errors: z.array(z.any()).optional().describe('Errors encountered during execution'),
      statementType: z
        .string()
        .optional()
        .describe('Type of SQL statement (SELECT, INSERT, UPDATE, etc.)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    ctx.progress('Submitting query job...');

    let jobResponse = await client.createQueryJob({
      query: ctx.input.query,
      defaultDataset: ctx.input.defaultDatasetId
        ? { datasetId: ctx.input.defaultDatasetId }
        : undefined,
      destinationTable:
        ctx.input.destinationDatasetId && ctx.input.destinationTableId
          ? {
              datasetId: ctx.input.destinationDatasetId,
              tableId: ctx.input.destinationTableId
            }
          : undefined,
      writeDisposition: ctx.input.writeDisposition,
      priority: ctx.input.priority,
      maximumBytesBilled: ctx.input.maximumBytesBilled,
      dryRun: ctx.input.dryRun,
      labels: ctx.input.labels,
      queryParameters: ctx.input.queryParameters,
      parameterMode: ctx.input.parameterMode
    });

    let jobId = jobResponse.jobReference.jobId;

    if (ctx.input.dryRun) {
      return {
        output: {
          jobId,
          jobComplete: true,
          totalBytesProcessed:
            jobResponse.statistics?.totalBytesProcessed ||
            jobResponse.statistics?.query?.totalBytesProcessed,
          statementType: jobResponse.statistics?.query?.statementType
        },
        message: `Dry run completed. Estimated bytes to process: **${jobResponse.statistics?.totalBytesProcessed || jobResponse.statistics?.query?.totalBytesProcessed || 'unknown'}**`
      };
    }

    ctx.progress(`Job **${jobId}** created. Waiting for completion...`);

    let completedJob = await client.waitForJob(jobId, 120000);
    let status = completedJob.status;

    if (status?.errorResult) {
      return {
        output: {
          jobId,
          jobComplete: true,
          errors: [status.errorResult, ...(status.errors || [])],
          totalBytesProcessed: completedJob.statistics?.totalBytesProcessed
        },
        message: `Query job **${jobId}** failed: ${status.errorResult.message}`
      };
    }

    let queryStats = completedJob.statistics?.query;
    let results = await client.getQueryResults(jobId, {
      maxResults: ctx.input.maxResults || 1000
    });

    return {
      output: {
        jobId,
        jobComplete: results.jobComplete,
        totalRows: results.totalRows,
        totalBytesProcessed:
          queryStats?.totalBytesProcessed || completedJob.statistics?.totalBytesProcessed,
        cacheHit: queryStats?.cacheHit,
        schema: results.schema,
        rows: results.rows,
        statementType: queryStats?.statementType
      },
      message: `Query completed. **${results.totalRows || 0}** rows returned. Processed **${queryStats?.totalBytesProcessed || 'unknown'}** bytes.${queryStats?.cacheHit ? ' (cache hit)' : ''}`
    };
  })
  .build();
