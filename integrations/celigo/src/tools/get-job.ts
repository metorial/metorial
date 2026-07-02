import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve details of a specific job by ID, and optionally include its errors. Jobs contain execution stats like number of successes, errors, and ignored records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to retrieve'),
      includeErrors: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, also fetch errors for this job (up to 1,000)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      type: z.string().optional().describe('Job type'),
      status: z.string().optional().describe('Job status'),
      numSuccess: z.number().optional().describe('Number of successful records'),
      numError: z.number().optional().describe('Number of errored records'),
      numIgnore: z.number().optional().describe('Number of ignored records'),
      startedAt: z.string().optional().describe('Job start time'),
      endedAt: z.string().optional().describe('Job end time'),
      jobErrors: z.array(z.any()).optional().describe('Job errors, if requested'),
      rawJob: z.any().describe('Full job object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let job = await client.getJob(ctx.input.jobId);

    let jobErrors: any[] | undefined;
    if (ctx.input.includeErrors) {
      try {
        jobErrors = await client.getJobErrors(ctx.input.jobId);
      } catch (err: any) {
        jobErrors = [{ error: err.message || 'Failed to fetch job errors' }];
      }
    }

    return {
      output: {
        jobId: job._id,
        type: job.type,
        status: job.status,
        numSuccess: job.numSuccess,
        numError: job.numError,
        numIgnore: job.numIgnore,
        startedAt: job.startedAt,
        endedAt: job.endedAt,
        jobErrors,
        rawJob: job
      },
      message: `Retrieved job **${job._id}** (status: ${job.status}, success: ${job.numSuccess ?? 0}, errors: ${job.numError ?? 0}).`
    };
  })
  .build();
