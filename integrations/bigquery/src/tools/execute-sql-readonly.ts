import { SlateTool } from 'slates';
import { z } from 'zod';
import { BigQueryClient } from '../lib/client';
import { bigQueryServiceError } from '../lib/errors';
import { spec } from '../spec';

let queryParameterSchema = z.object({
  name: z
    .string()
    .optional()
    .describe('Parameter name for NAMED mode; omit for POSITIONAL mode'),
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
        .array(z.object({ value: z.string().describe('Array element value') }))
        .optional()
        .describe('Array values')
    })
    .describe('Parameter value')
});

let assertSelectStatement = (statementType: unknown, phase: 'dry_run' | 'completed_job') => {
  if (statementType === 'SELECT') {
    return;
  }

  let serviceError = bigQueryServiceError(
    `Read-only query ${phase === 'dry_run' ? 'dry run' : 'completed job'} reported statement type **${typeof statementType === 'string' ? statementType : 'unknown'}**. Only SELECT statements are allowed.`
  );
  serviceError.data.reason = 'bigquery_readonly_statement_type_rejected';
  serviceError.data.phase = phase;
  serviceError.data.statementType = statementType;
  throw serviceError;
};

export let executeSqlReadonly = SlateTool.create(spec, {
  name: 'Execute Read-only SQL Query',
  key: 'execute_sql_readonly',
  description:
    'Run a read-only GoogleSQL query against BigQuery. The exact SQL is dry-run first and executes only when BigQuery classifies it as a SELECT statement. Scripts, procedures, DML, and DDL are rejected.',
  instructions: [
    'Use standard GoogleSQL syntax, not legacy SQL.',
    'Only a single SELECT statement is allowed. Scripts, CALL statements, DML, and DDL are rejected.',
    'For named parameters, use NAMED mode with matching @param_name references. For positional parameters, use POSITIONAL mode with ? placeholders and omit parameter names.',
    'Set maximumBytesBilled to limit query costs.',
    'Queries against Drive-backed external tables (e.g. Google Sheets federated tables) require Google Drive access, which this connection does not request; such queries fail with a permission error.'
  ],
  constraints: [
    'Every query incurs a validation dry run before the real query job is submitted.',
    'Query results are limited to maxResults rows per response (default 1000).',
    'The job is polled for up to 120 seconds before timing out.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Single read-only SELECT statement in GoogleSQL'),
      defaultDatasetId: z
        .string()
        .optional()
        .describe('Default dataset for unqualified table names'),
      maximumBytesBilled: z
        .string()
        .optional()
        .describe('Maximum bytes billed limit to control costs'),
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
        .describe('Query parameters for the SELECT statement'),
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
      statementType: z.literal('SELECT').describe('Validated BigQuery statement type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BigQueryClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      location: ctx.config.location
    });

    let queryJob = {
      query: ctx.input.query,
      defaultDataset: ctx.input.defaultDatasetId
        ? { datasetId: ctx.input.defaultDatasetId }
        : undefined,
      maximumBytesBilled: ctx.input.maximumBytesBilled,
      labels: ctx.input.labels,
      queryParameters: ctx.input.queryParameters,
      parameterMode: ctx.input.parameterMode
    };

    ctx.progress('Validating read-only query with a dry run...');
    let dryRunJob = await client.createQueryJob({
      ...queryJob,
      dryRun: true
    });
    assertSelectStatement(dryRunJob.statistics?.query?.statementType, 'dry_run');

    ctx.progress('Submitting validated read-only query job...');
    let jobResponse = await client.createQueryJob(queryJob);
    let jobId = jobResponse.jobReference.jobId;

    ctx.progress(`Job **${jobId}** created. Waiting for completion...`);
    let completedJob = await client.waitForJob(jobId, 120000);
    let status = completedJob.status;

    if (status?.errorResult) {
      let serviceError = bigQueryServiceError(
        `Read-only query job ${jobId} failed: ${status.errorResult.message || 'Unknown query error.'}`
      );
      serviceError.data.reason = 'bigquery_readonly_query_job_failed';
      serviceError.data.jobId = jobId;
      serviceError.data.errors = [status.errorResult, ...(status.errors || [])];
      serviceError.data.totalBytesProcessed = completedJob.statistics?.totalBytesProcessed;
      throw serviceError;
    }

    let queryStats = completedJob.statistics?.query;
    assertSelectStatement(queryStats?.statementType, 'completed_job');

    let results = await client.getQueryResults(jobId, {
      maxResults: ctx.input.maxResults ?? 1000
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
        statementType: 'SELECT' as const
      },
      message: `Read-only query completed. **${results.totalRows || 0}** rows returned. Processed **${queryStats?.totalBytesProcessed || 'unknown'}** bytes.${queryStats?.cacheHit ? ' (cache hit)' : ''}`
    };
  })
  .build();
