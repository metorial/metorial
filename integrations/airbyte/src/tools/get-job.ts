import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getJobTool = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve the status and details of a specific Airbyte sync or reset job, including progress metrics like bytes synced, rows synced, and duration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.number().describe('The numeric ID of the job to retrieve.')
    })
  )
  .output(
    z.object({
      jobId: z.number(),
      status: z.string(),
      jobType: z.string(),
      startTime: z.string(),
      connectionId: z.string(),
      lastUpdatedAt: z.string().optional(),
      duration: z.string().optional(),
      bytesSynced: z.number().optional(),
      rowsSynced: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let job = await client.getJob(ctx.input.jobId);

    return {
      output: {
        jobId: job.jobId,
        status: job.status,
        jobType: job.jobType,
        startTime: job.startTime,
        connectionId: job.connectionId,
        lastUpdatedAt: job.lastUpdatedAt,
        duration: job.duration,
        bytesSynced: job.bytesSynced,
        rowsSynced: job.rowsSynced
      },
      message: `Job **${job.jobId}** — status: **${job.status}**, type: ${job.jobType}${job.rowsSynced !== undefined ? `, rows synced: ${job.rowsSynced}` : ''}.`
    };
  })
  .build();
