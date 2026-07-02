import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let flowErrorDetected = SlateTrigger.create(spec, {
  name: 'Flow Error Detected',
  key: 'flow_error_detected',
  description:
    'Triggers when new errors appear in a specific flow step. Polls for new jobs with errors and returns job-level error counts. Use the Get Flow Errors tool to retrieve individual error details.'
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID where errors were detected'),
      flowId: z.string().describe('Flow ID where errors occurred'),
      numError: z.number().describe('Number of errors in the job'),
      numSuccess: z.number().optional().describe('Number of successes in the job'),
      status: z.string().describe('Job status'),
      createdAt: z.string().describe('Job creation time'),
      rawJob: z.any().describe('Full job object')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job ID where errors were detected'),
      flowId: z.string().describe('Flow ID where errors occurred'),
      numError: z.number().describe('Number of errors in the job'),
      numSuccess: z.number().optional().describe('Number of successes in the job'),
      status: z.string().describe('Job status'),
      type: z.string().optional().describe('Job type'),
      retriable: z.boolean().optional().describe('Whether the errors are retriable'),
      startedAt: z.string().optional().describe('Job start time'),
      endedAt: z.string().optional().describe('Job end time')
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

      let jobsWithErrors = jobs.filter(
        (j: any) => (j.status === 'completed' || j.status === 'failed') && j.numError > 0
      );

      let seenIds = (ctx.state?.seenIds as string[] | undefined) || [];
      let newJobs = jobsWithErrors.filter((j: any) => !seenIds.includes(j._id));

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
          flowId: j._flowId,
          numError: j.numError,
          numSuccess: j.numSuccess,
          status: j.status,
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
        type: 'flow.error_detected',
        id: `${input.jobId}-errors`,
        output: {
          jobId: input.jobId,
          flowId: input.flowId,
          numError: input.numError,
          numSuccess: input.numSuccess,
          status: input.status,
          type: input.rawJob?.type,
          retriable: input.rawJob?.retriable,
          startedAt: input.rawJob?.startedAt,
          endedAt: input.rawJob?.endedAt
        }
      };
    }
  })
  .build();
