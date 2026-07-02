import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let manageBulkJob = SlateTool.create(spec, {
  name: 'Manage Bulk Job',
  key: 'manage_bulk_job',
  description: `Create, monitor, and manage Salesforce Bulk API 2.0 jobs for processing large data volumes. Supports creating ingest jobs (insert, update, upsert, delete), uploading CSV data, closing/aborting jobs, checking status, and retrieving results. Also supports bulk query jobs.`,
  instructions: [
    'To run a bulk ingest: create a job, upload CSV data, then close the job to begin processing.',
    'CSV data must include column headers matching Salesforce field API names.',
    'Poll the job status until state is "JobComplete" or "Failed" before retrieving results.'
  ],
  constraints: [
    'Individual CSV uploads are limited to 150 MB.',
    'Bulk API has a limit on concurrent jobs per org.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'createIngestJob',
          'uploadData',
          'closeJob',
          'abortJob',
          'getStatus',
          'getResults',
          'createQueryJob',
          'getQueryStatus',
          'getQueryResults'
        ])
        .describe('The bulk operation to perform'),
      objectType: z
        .string()
        .optional()
        .describe('Salesforce object type (required for createIngestJob)'),
      operation: z
        .enum(['insert', 'update', 'upsert', 'delete'])
        .optional()
        .describe('Bulk operation type (required for createIngestJob)'),
      jobId: z
        .string()
        .optional()
        .describe(
          'Bulk job ID (required for uploadData, closeJob, abortJob, getStatus, getResults, getQueryStatus, getQueryResults)'
        ),
      csvData: z.string().optional().describe('CSV data to upload (required for uploadData)'),
      soql: z
        .string()
        .optional()
        .describe('SOQL query for bulk query job (required for createQueryJob)'),
      externalIdFieldName: z
        .string()
        .optional()
        .describe('External ID field name (required for upsert operations)'),
      resultType: z
        .enum(['successfulResults', 'failedResults', 'unprocessedrecords'])
        .optional()
        .describe('Type of results to retrieve (for getResults action)')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('The bulk job ID'),
      state: z.string().optional().describe('Current state of the bulk job'),
      jobResult: z.any().optional().describe('Full job status or result data')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let { action } = ctx.input;
    let result: any;

    if (action === 'createIngestJob') {
      if (!ctx.input.objectType || !ctx.input.operation) {
        throw new Error('objectType and operation are required for createIngestJob');
      }
      result = await client.createBulkJob(ctx.input.operation, ctx.input.objectType, {
        externalIdFieldName: ctx.input.externalIdFieldName
      });
      return {
        output: { jobId: result.id, state: result.state, jobResult: result },
        message: `Created bulk ${ctx.input.operation} job \`${result.id}\` for **${ctx.input.objectType}**`
      };
    }

    if (action === 'uploadData') {
      if (!ctx.input.jobId || !ctx.input.csvData) {
        throw new Error('jobId and csvData are required for uploadData');
      }
      result = await client.uploadBulkJobData(ctx.input.jobId, ctx.input.csvData);
      return {
        output: { jobId: ctx.input.jobId, jobResult: result },
        message: `Uploaded CSV data to bulk job \`${ctx.input.jobId}\``
      };
    }

    if (action === 'closeJob') {
      if (!ctx.input.jobId) throw new Error('jobId is required for closeJob');
      result = await client.closeBulkJob(ctx.input.jobId);
      return {
        output: { jobId: ctx.input.jobId, state: result.state, jobResult: result },
        message: `Closed bulk job \`${ctx.input.jobId}\` — processing started`
      };
    }

    if (action === 'abortJob') {
      if (!ctx.input.jobId) throw new Error('jobId is required for abortJob');
      result = await client.abortBulkJob(ctx.input.jobId);
      return {
        output: { jobId: ctx.input.jobId, state: result.state, jobResult: result },
        message: `Aborted bulk job \`${ctx.input.jobId}\``
      };
    }

    if (action === 'getStatus') {
      if (!ctx.input.jobId) throw new Error('jobId is required for getStatus');
      result = await client.getBulkJobStatus(ctx.input.jobId);
      return {
        output: { jobId: ctx.input.jobId, state: result.state, jobResult: result },
        message: `Bulk job \`${ctx.input.jobId}\` status: **${result.state}** (${result.numberRecordsProcessed || 0} processed, ${result.numberRecordsFailed || 0} failed)`
      };
    }

    if (action === 'getResults') {
      if (!ctx.input.jobId) throw new Error('jobId is required for getResults');
      let rType = ctx.input.resultType || 'successfulResults';
      result = await client.getBulkJobResults(ctx.input.jobId, rType);
      return {
        output: { jobId: ctx.input.jobId, jobResult: result },
        message: `Retrieved **${rType}** for bulk job \`${ctx.input.jobId}\``
      };
    }

    if (action === 'createQueryJob') {
      if (!ctx.input.soql) throw new Error('soql is required for createQueryJob');
      result = await client.createBulkQueryJob(ctx.input.soql);
      return {
        output: { jobId: result.id, state: result.state, jobResult: result },
        message: `Created bulk query job \`${result.id}\``
      };
    }

    if (action === 'getQueryStatus') {
      if (!ctx.input.jobId) throw new Error('jobId is required for getQueryStatus');
      result = await client.getBulkQueryJobStatus(ctx.input.jobId);
      return {
        output: { jobId: ctx.input.jobId, state: result.state, jobResult: result },
        message: `Bulk query job \`${ctx.input.jobId}\` status: **${result.state}**`
      };
    }

    if (action === 'getQueryResults') {
      if (!ctx.input.jobId) throw new Error('jobId is required for getQueryResults');
      result = await client.getBulkQueryResults(ctx.input.jobId);
      return {
        output: { jobId: ctx.input.jobId, jobResult: result },
        message: `Retrieved results for bulk query job \`${ctx.input.jobId}\``
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
