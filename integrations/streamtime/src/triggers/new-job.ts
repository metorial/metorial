import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let newJob = SlateTrigger.create(spec, {
  name: 'New Job',
  key: 'new_job',
  description: 'Triggers when a new job is created in Streamtime.'
})
  .input(
    z.object({
      jobId: z.number().describe('ID of the job'),
      jobName: z.string().describe('Name of the job'),
      jobNumber: z.string().optional().describe('Job number'),
      raw: z.record(z.string(), z.any()).describe('Full job data')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('ID of the new job'),
      jobName: z.string().describe('Name of the job'),
      jobNumber: z.string().optional().describe('Job number'),
      raw: z.record(z.string(), z.any()).describe('Full job data from the API')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new StreamtimeClient({ token: ctx.auth.token });
      let state = ctx.state as { knownJobIds?: number[] } | null;
      let knownJobIds = state?.knownJobIds || [];

      let searchBody: Record<string, any> = {
        searchView: 7
      };

      let result = await client.search(searchBody);
      let jobs: any[] = Array.isArray(result) ? result : result.data || result.results || [];

      let newJobs =
        knownJobIds.length === 0
          ? []
          : jobs.filter((job: any) => !knownJobIds.includes(job.id));

      let allIds = jobs.map((job: any) => job.id);

      return {
        inputs: newJobs.map((job: any) => ({
          jobId: job.id,
          jobName: job.name || '',
          jobNumber: job.number,
          raw: job
        })),
        updatedState: {
          knownJobIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'job.created',
        id: String(ctx.input.jobId),
        output: {
          jobId: ctx.input.jobId,
          jobName: ctx.input.jobName,
          jobNumber: ctx.input.jobNumber,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
