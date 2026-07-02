import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

let jobStatusSchema = z.object({
  jobName: z.string().describe('Name of the job'),
  jobType: z.enum(['crawl', 'bulk']).describe('Type of job (crawl or bulk)'),
  jobStatus: z.string().describe('Current status of the job'),
  objectsFound: z.number().optional().describe('Number of objects found'),
  pageProcessSuccesses: z
    .number()
    .optional()
    .describe('Number of pages successfully processed'),
  pageProcessAttempts: z
    .number()
    .optional()
    .describe('Number of pages attempted for processing'),
  pageCrawlSuccesses: z
    .number()
    .optional()
    .describe('Number of pages successfully crawled (crawl jobs only)'),
  pageCrawlAttempts: z
    .number()
    .optional()
    .describe('Number of pages attempted for crawling (crawl jobs only)'),
  urlsHarvested: z.number().optional().describe('Number of URLs discovered (crawl jobs only)'),
  jobCreationTimeUTC: z.number().optional().describe('Job creation timestamp (UTC)'),
  jobCompletionTimeUTC: z.number().optional().describe('Job completion timestamp (UTC)'),
  downloadJson: z.string().optional().describe('URL to download results as JSON'),
  notifyWebhook: z.string().optional().describe('Configured webhook notification URL')
});

export let crawlBulkJobCompleted = SlateTrigger.create(spec, {
  name: 'Crawl/Bulk Job Completed',
  key: 'crawl_bulk_job_completed',
  description:
    'Triggers when a Diffbot crawl or bulk extraction job completes or reaches its processing limits. Polls for status changes across all active crawl and bulk jobs.'
})
  .input(
    z.object({
      jobName: z.string().describe('Name of the completed job'),
      jobType: z.enum(['crawl', 'bulk']).describe('Type of job'),
      rawJob: z.any().describe('Raw job data from the API')
    })
  )
  .output(jobStatusSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DiffbotClient({ token: ctx.auth.token });

      let previousCompletedJobs: Record<string, boolean> = ctx.state?.completedJobs || {};
      let inputs: Array<{ jobName: string; jobType: 'crawl' | 'bulk'; rawJob: any }> = [];
      let updatedCompletedJobs: Record<string, boolean> = { ...previousCompletedJobs };

      let crawlResult = await client.listCrawls();
      let crawlJobs = crawlResult.jobs || [];

      for (let job of crawlJobs) {
        let name = job.name || '';
        let jobKey = `crawl:${name}`;
        let jobStatusCode =
          typeof job.jobStatus === 'object' ? job.jobStatus?.status : job.jobStatus;
        let isComplete =
          jobStatusCode === 9 ||
          jobStatusCode === 10 ||
          String(jobStatusCode).includes('DONE') ||
          String(jobStatusCode).includes('COMPLETE') ||
          job.sentDone === true;

        if (isComplete && !previousCompletedJobs[jobKey]) {
          inputs.push({
            jobName: name,
            jobType: 'crawl',
            rawJob: job
          });
          updatedCompletedJobs[jobKey] = true;
        } else if (isComplete) {
          updatedCompletedJobs[jobKey] = true;
        }
      }

      let bulkResult = await client.listBulkJobs();
      let bulkJobs = bulkResult.jobs || [];

      for (let job of bulkJobs) {
        let name = job.name || '';
        let jobKey = `bulk:${name}`;
        let jobStatusCode =
          typeof job.jobStatus === 'object' ? job.jobStatus?.status : job.jobStatus;
        let isComplete =
          jobStatusCode === 9 ||
          jobStatusCode === 10 ||
          String(jobStatusCode).includes('DONE') ||
          String(jobStatusCode).includes('COMPLETE') ||
          job.sentDone === true;

        if (isComplete && !previousCompletedJobs[jobKey]) {
          inputs.push({
            jobName: name,
            jobType: 'bulk',
            rawJob: job
          });
          updatedCompletedJobs[jobKey] = true;
        } else if (isComplete) {
          updatedCompletedJobs[jobKey] = true;
        }
      }

      return {
        inputs,
        updatedState: {
          completedJobs: updatedCompletedJobs
        }
      };
    },

    handleEvent: async ctx => {
      let job = ctx.input.rawJob;
      let statusValue =
        typeof job.jobStatus === 'object'
          ? job.jobStatus?.message || 'completed'
          : String(job.jobStatus || 'completed');

      return {
        type: `${ctx.input.jobType}_job.completed`,
        id: `${ctx.input.jobType}:${ctx.input.jobName}:${job.jobCompletionTimeUTC || Date.now()}`,
        output: {
          jobName: ctx.input.jobName,
          jobType: ctx.input.jobType,
          jobStatus: statusValue,
          objectsFound: job.objectsFound,
          pageProcessSuccesses: job.pageProcessSuccesses,
          pageProcessAttempts: job.pageProcessAttempts,
          pageCrawlSuccesses: job.pageCrawlSuccesses,
          pageCrawlAttempts: job.pageCrawlAttempts,
          urlsHarvested: job.urlsHarvested,
          jobCreationTimeUTC: job.jobCreationTimeUTC,
          jobCompletionTimeUTC: job.jobCompletionTimeUTC,
          downloadJson: job.downloadJson,
          notifyWebhook: job.notifyWebhook
        }
      };
    }
  })
  .build();
