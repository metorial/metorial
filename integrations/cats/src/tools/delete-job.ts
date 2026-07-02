import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteJob = SlateTool.create(spec, {
  name: 'Delete Job',
  key: 'delete_job',
  description: `Permanently delete a job order from CATS. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to delete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the deleted job'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteJob(ctx.input.jobId);

    return {
      output: {
        jobId: ctx.input.jobId,
        deleted: true
      },
      message: `Deleted job **${ctx.input.jobId}**.`
    };
  })
  .build();
