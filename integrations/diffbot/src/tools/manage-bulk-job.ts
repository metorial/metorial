import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

let bulkJobSchema = z
  .object({
    jobName: z.string().optional().describe('Name of the bulk job'),
    jobStatus: z.string().optional().describe('Current status of the bulk job'),
    sentDone: z.boolean().optional().describe('Whether the job has finished processing'),
    objectsFound: z.number().optional().describe('Number of objects found'),
    pageProcessAttempts: z
      .number()
      .optional()
      .describe('Number of pages attempted for processing'),
    pageProcessSuccesses: z
      .number()
      .optional()
      .describe('Number of pages successfully processed'),
    jobCreationTimeUTC: z.number().optional().describe('Job creation time (UTC timestamp)'),
    jobCompletionTimeUTC: z
      .number()
      .optional()
      .describe('Job completion time (UTC timestamp)'),
    downloadJson: z.string().optional().describe('URL to download results as JSON'),
    notifyWebhook: z.string().optional().describe('Configured webhook notification URL')
  })
  .passthrough();

export let manageBulkJob = SlateTool.create(spec, {
  name: 'Manage Bulk Job',
  key: 'manage_bulk_job',
  description: `Create, monitor, and retrieve results from Diffbot bulk extraction jobs. Bulk jobs process a list of known URLs through Diffbot's extraction APIs as a batch. Supports creating jobs, checking status, deleting, listing, and downloading results.`,
  instructions: [
    'Set **action** to "create" and provide a list of URLs to start a new bulk job.',
    'Use "status" to check progress of a running job.',
    'Use "results" to download extracted data from a completed job.'
  ],
  constraints: ['Bulk job names must be unique within your account.']
})
  .input(
    z.object({
      action: z
        .enum(['create', 'status', 'list', 'delete', 'results'])
        .describe('Action to perform on the bulk job'),
      jobName: z
        .string()
        .optional()
        .describe('Name of the bulk job (required for all actions except "list")'),
      urls: z
        .array(z.string())
        .optional()
        .describe('List of URLs to process (required for "create")'),
      extractionType: z
        .enum([
          'analyze',
          'article',
          'product',
          'discussion',
          'image',
          'video',
          'list',
          'event',
          'job'
        ])
        .optional()
        .describe('Type of extraction to apply to each URL'),
      notifyWebhook: z
        .string()
        .optional()
        .describe('Webhook URL to notify when the job completes'),
      resultCount: z
        .number()
        .optional()
        .describe('Number of results to return (for "results" action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      bulkJob: bulkJobSchema.optional().describe('Bulk job details'),
      bulkJobs: z
        .array(bulkJobSchema)
        .optional()
        .describe('List of all bulk jobs (for "list" action)'),
      results: z.any().optional().describe('Extracted results data (for "results" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiffbotClient({ token: ctx.auth.token });
    let { action, jobName } = ctx.input;

    if (action === 'list') {
      let result = await client.listBulkJobs();
      let jobs = result.jobs || [];
      return {
        output: {
          success: true,
          bulkJobs: jobs
        },
        message: `Found **${jobs.length}** bulk job(s).`
      };
    }

    if (!jobName) {
      throw new Error('jobName is required for this action.');
    }

    if (action === 'create') {
      if (!ctx.input.urls || ctx.input.urls.length === 0) {
        throw new Error('At least one URL is required to create a bulk job.');
      }

      let result = await client.createBulkJob({
        name: jobName,
        urls: ctx.input.urls,
        apiType: ctx.input.extractionType,
        notifyWebhook: ctx.input.notifyWebhook
      });

      let job = result.jobs?.[0] || result;

      return {
        output: {
          success: true,
          bulkJob: job
        },
        message: `Created bulk job **${jobName}** with ${ctx.input.urls.length} URL(s).`
      };
    }

    if (action === 'status') {
      let result = await client.getBulkJobStatus(jobName);
      let job = result.jobs?.[0] || result;
      return {
        output: {
          success: true,
          bulkJob: job
        },
        message: `Bulk job **${jobName}** status: **${job.jobStatus?.message || job.jobStatus || 'unknown'}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteBulkJob(jobName);
      return {
        output: {
          success: true
        },
        message: `Deleted bulk job **${jobName}**.`
      };
    }

    if (action === 'results') {
      let results = await client.getBulkJobResults(jobName, undefined, ctx.input.resultCount);
      return {
        output: {
          success: true,
          results
        },
        message: `Retrieved results for bulk job **${jobName}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
