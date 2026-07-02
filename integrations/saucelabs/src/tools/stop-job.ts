import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let stopJob = SlateTool.create(spec, {
  name: 'Stop Test Job',
  key: 'stop_job',
  description: `Stop a currently running test job. Works with both VDC and RDC jobs. Use this to abort a test that is stuck or no longer needed.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the running test job to stop'),
      source: z
        .enum(['vdc', 'rdc'])
        .default('vdc')
        .describe('Device source: vdc (virtual devices) or rdc (real devices)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the stopped job'),
      status: z.string().optional().describe('Updated job status after stopping')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.source === 'rdc') {
      let result = await client.stopRdcJob(ctx.input.jobId);
      return {
        output: {
          jobId: ctx.input.jobId,
          status: result?.status ?? 'stopped'
        },
        message: `Stopped RDC job **${ctx.input.jobId}**.`
      };
    }

    let result = await client.stopJob(ctx.input.jobId);
    return {
      output: {
        jobId: ctx.input.jobId,
        status: result?.status ?? 'stopped'
      },
      message: `Stopped VDC job **${ctx.input.jobId}**.`
    };
  })
  .build();
