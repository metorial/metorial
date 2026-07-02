import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteJob = SlateTool.create(spec, {
  name: 'Delete Test Job',
  key: 'delete_job',
  description: `Permanently delete a test job and its associated data from Sauce Labs. Works with both VDC and RDC jobs. This action cannot be undone.`,
  tags: { destructive: true },
  constraints: [
    'This action is irreversible. The job and all associated assets will be permanently deleted.'
  ]
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the test job to delete'),
      source: z
        .enum(['vdc', 'rdc'])
        .default('vdc')
        .describe('Device source: vdc (virtual devices) or rdc (real devices)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the deleted job'),
      deleted: z.boolean().describe('Whether the job was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.source === 'rdc') {
      await client.deleteRdcJob(ctx.input.jobId);
    } else {
      await client.deleteJob(ctx.input.jobId);
    }

    return {
      output: {
        jobId: ctx.input.jobId,
        deleted: true
      },
      message: `Deleted ${ctx.input.source.toUpperCase()} job **${ctx.input.jobId}**.`
    };
  })
  .build();
