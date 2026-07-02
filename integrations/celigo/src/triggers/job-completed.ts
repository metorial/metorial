import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let jobCompleted = SlateTrigger.create(spec, {
  name: 'Job Completed',
  key: 'job_completed',
  description:
    'Triggers when a flow job completes, fails, or is cancelled. Polls for recently finished jobs and returns their execution stats.'
})
  .input(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      status: z.string().describe('Job status (completed, failed, cancelled)'),
      flowId: z.string().optional().describe('Associated flow ID'),
      numSuccess: z.number().optional().describe('Number of successful records'),
      numError: z.number().optional().describe('Number of errored records'),
      startedAt: z.string().optional().describe('Job start time'),
      endedAt: z.string().optional().describe('Job end time'),
      createdAt: z.string().describe('Job creation time'),
      rawJob: z.any().describe('Full job object')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      status: z.string().describe('Job status'),
      flowId: z.string().optional().describe('Associated flow ID'),
      numSuccess: z.number().optional().describe('Number of successful records'),
      numError: z.number().optional().describe('Number of errored records'),
      numIgnore: z.number().optional().describe('Number of ignored records'),
      startedAt: z.string().optional().describe('Job start time'),
      endedAt: z.string().optional().describe('Job end time'),
      type: z.string().optional().describe('Job type'),
      retriable: z.boolean().optional().describe('Whether the failed records are retriable')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let params: Record<string, string> = {};

      if (lastPollTime) {
        params.createdAt_gte = lastPollTime;
      }

      let jobs = await client.listJobs(params);

      let finishedJobs = jobs.filter(
        (j: any) =>
          j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled'
      );

      let seenIds = (ctx.state?.seenIds as string[] | undefined) || [];
      let newJobs = finishedJobs.filter((j: any) => !seenIds.includes(j._id));

      let newSeenIds = [...seenIds, ...newJobs.map((j: any) => j._id)].slice(-500);

      let newLastPollTime = lastPollTime;
      if (jobs.length > 0) {
        let mostRecentCreatedAt = jobs[0]?.createdAt;
        if (
          mostRecentCreatedAt &&
          (!newLastPollTime || mostRecentCreatedAt > newLastPollTime)
        ) {
          newLastPollTime = mostRecentCreatedAt;
        }
      }

      return {
        inputs: newJobs.map((j: any) => ({
          jobId: j._id,
          status: j.status,
          flowId: j._flowId,
          numSuccess: j.numSuccess,
          numError: j.numError,
          startedAt: j.startedAt,
          endedAt: j.endedAt,
          createdAt: j.createdAt,
          rawJob: j
        })),
        updatedState: {
          lastPollTime: newLastPollTime,
          seenIds: newSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `job.${input.status}`,
        id: input.jobId,
        output: {
          jobId: input.jobId,
          status: input.status,
          flowId: input.flowId,
          numSuccess: input.numSuccess,
          numError: input.numError,
          numIgnore: input.rawJob?.numIgnore,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          type: input.rawJob?.type,
          retriable: input.rawJob?.retriable
        }
      };
    }
  })
  .build();
