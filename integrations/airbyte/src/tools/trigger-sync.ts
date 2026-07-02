import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let triggerSyncTool = SlateTool.create(spec, {
  name: 'Trigger Sync Job',
  key: 'trigger_sync',
  description: `Trigger a sync or reset job on an Airbyte connection. A sync job moves data from source to destination. A reset job clears previously synced data at the destination.`
})
  .input(
    z.object({
      connectionId: z.string().describe('UUID of the connection to trigger a job for.'),
      jobType: z.enum(['sync', 'reset']).default('sync').describe('Type of job to trigger.')
    })
  )
  .output(
    z.object({
      jobId: z.number(),
      status: z.string(),
      jobType: z.string(),
      startTime: z.string(),
      connectionId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let job = await client.createJob({
      connectionId: ctx.input.connectionId,
      jobType: ctx.input.jobType
    });

    return {
      output: {
        jobId: job.jobId,
        status: job.status,
        jobType: job.jobType,
        startTime: job.startTime,
        connectionId: job.connectionId
      },
      message: `Triggered **${job.jobType}** job (ID: ${job.jobId}, status: ${job.status}).`
    };
  })
  .build();
