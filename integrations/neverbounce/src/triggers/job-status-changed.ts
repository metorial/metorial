import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let jobStatusChangedTrigger = SlateTrigger.create(spec, {
  name: 'Job Status Changed',
  key: 'job_status_changed',
  description:
    'Triggers when a NeverBounce verification job changes status. Set the callback URL when creating a job via the Create Verification Job tool to receive these notifications.'
})
  .input(
    z.object({
      eventType: z.string().describe('The job event type'),
      jobId: z.number().describe('The job ID')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('The job ID that changed status'),
      jobStatus: z.string().describe('Current job status'),
      filename: z.string().describe('Job filename'),
      createdAt: z.string().describe('Job creation timestamp'),
      startedAt: z.string().describe('Job start timestamp'),
      finishedAt: z.string().describe('Job completion timestamp'),
      totalRecords: z.number().describe('Total records in the job'),
      totalProcessed: z.number().describe('Records processed so far'),
      bounceEstimate: z.number().describe('Estimated bounce rate (0-100)'),
      percentComplete: z.number().describe('Completion percentage (0-100)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as { event?: string; job_id?: number };

      let eventType = body.event || 'unknown';
      let jobId = body.job_id || 0;

      return {
        inputs: [
          {
            eventType,
            jobId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let status = await client.getJobStatus(ctx.input.jobId);

      return {
        type: `job.${ctx.input.eventType}`,
        id: `${ctx.input.jobId}-${ctx.input.eventType}`,
        output: {
          jobId: status.jobId,
          jobStatus: status.jobStatus,
          filename: status.filename,
          createdAt: status.createdAt,
          startedAt: status.startedAt,
          finishedAt: status.finishedAt,
          totalRecords: status.total.records,
          totalProcessed: status.total.processed,
          bounceEstimate: status.bounceEstimate,
          percentComplete: status.percentComplete
        }
      };
    }
  })
  .build();
