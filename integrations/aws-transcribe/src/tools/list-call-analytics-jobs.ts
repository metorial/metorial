import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let listCallAnalyticsJobs = SlateTool.create(spec, {
  name: 'List Call Analytics Jobs',
  key: 'list_call_analytics_jobs',
  description:
    'List Call Analytics jobs in your AWS account. Filter by job status or job name and paginate through results.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['QUEUED', 'IN_PROGRESS', 'FAILED', 'COMPLETED'])
        .optional()
        .describe('Filter by job status'),
      jobNameContains: z
        .string()
        .optional()
        .describe('Filter jobs whose name contains this string'),
      maxResults: z.number().optional().describe('Maximum number of results (1-100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobName: z.string().describe('Name of the Call Analytics job'),
            jobStatus: z.string().describe('Current status of the job'),
            languageCode: z.string().optional().describe('Language code'),
            creationTime: z.number().optional().describe('Unix timestamp when created'),
            startTime: z.number().optional().describe('Unix timestamp when started'),
            completionTime: z.number().optional().describe('Unix timestamp when completed'),
            failureReason: z.string().optional().describe('Failure reason, if any')
          })
        )
        .describe('List of Call Analytics job summaries'),
      nextToken: z.string().optional().describe('Pagination token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TranscribeClient({
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      },
      region: ctx.config.region
    });

    let result = await client.listCallAnalyticsJobs(ctx.input);
    let jobs = (result.CallAnalyticsJobSummaries || []).map((job: any) => ({
      jobName: job.CallAnalyticsJobName,
      jobStatus: job.CallAnalyticsJobStatus,
      languageCode: job.LanguageCode,
      creationTime: job.CreationTime,
      startTime: job.StartTime,
      completionTime: job.CompletionTime,
      failureReason: job.FailureReason
    }));

    return {
      output: {
        jobs,
        nextToken: result.NextToken
      },
      message: `Found **${jobs.length}** Call Analytics job(s).${result.NextToken ? ' More results are available with pagination.' : ''}`
    };
  });
