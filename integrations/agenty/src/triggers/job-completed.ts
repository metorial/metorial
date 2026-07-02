import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let jobCompleted = SlateTrigger.create(spec, {
  name: 'Job Completed',
  key: 'job_completed',
  description:
    'Triggers when an agent job completes, stops, or fails. Polls for newly finished jobs and returns job details with status and result summary.'
})
  .input(
    z.object({
      jobId: z.string().describe('The job ID.'),
      agentId: z.string().describe('The agent ID the job belongs to.'),
      status: z.string().describe('The final job status.'),
      pagesProcessed: z.number().optional().nullable().describe('Number of pages processed.'),
      pagesSucceeded: z
        .number()
        .optional()
        .nullable()
        .describe('Number of pages successfully scraped.'),
      pagesFailed: z.number().optional().nullable().describe('Number of pages that failed.'),
      createdAt: z.string().optional().nullable().describe('ISO 8601 creation timestamp.'),
      completedAt: z.string().optional().nullable().describe('ISO 8601 completion timestamp.')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job identifier.'),
      agentId: z.string().describe('Agent ID the job belongs to.'),
      status: z.string().describe('Final job status (completed, stopped, or failed).'),
      pagesProcessed: z.number().optional().nullable().describe('Total pages processed.'),
      pagesSucceeded: z.number().optional().nullable().describe('Pages successfully scraped.'),
      pagesFailed: z.number().optional().nullable().describe('Pages that failed.'),
      createdAt: z.string().optional().nullable().describe('When the job was created.'),
      completedAt: z.string().optional().nullable().describe('When the job completed.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listJobs({ limit: 50 });
      let allJobs = result.result || [];

      let seenJobIds: Record<string, boolean> = (ctx.state as any)?.seenJobIds || {};

      let terminalStatuses = ['completed', 'stopped', 'failed'];
      let newJobs = allJobs.filter(
        (j: any) => terminalStatuses.includes(j.status) && !seenJobIds[j.job_id]
      );

      let updatedSeenJobIds: Record<string, boolean> = { ...seenJobIds };
      for (let j of allJobs) {
        if (terminalStatuses.includes(j.status)) {
          updatedSeenJobIds[j.job_id] = true;
        }
      }

      // Keep only the last 500 job IDs to prevent state from growing unbounded
      let jobIdKeys = Object.keys(updatedSeenJobIds);
      if (jobIdKeys.length > 500) {
        let trimmedIds: Record<string, boolean> = {};
        for (let id of jobIdKeys.slice(-500)) {
          trimmedIds[id] = true;
        }
        updatedSeenJobIds = trimmedIds;
      }

      return {
        inputs: newJobs.map((j: any) => ({
          jobId: j.job_id,
          agentId: j.agent_id,
          status: j.status,
          pagesProcessed: j.pages_processed,
          pagesSucceeded: j.pages_successed ?? j.pages_succeeded,
          pagesFailed: j.pages_failed,
          createdAt: j.created_at,
          completedAt: j.completed_at
        })),
        updatedState: {
          seenJobIds: updatedSeenJobIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `job.${ctx.input.status}`,
        id: ctx.input.jobId,
        output: {
          jobId: ctx.input.jobId,
          agentId: ctx.input.agentId,
          status: ctx.input.status,
          pagesProcessed: ctx.input.pagesProcessed,
          pagesSucceeded: ctx.input.pagesSucceeded,
          pagesFailed: ctx.input.pagesFailed,
          createdAt: ctx.input.createdAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
