import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteJob = SlateTool.create(spec, {
  name: 'Delete Job',
  key: 'delete_job',
  description: `Delete a job from ServiceM8 by UUID. This marks the job as inactive/deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobUuid: z.string().describe('UUID of the job to delete')
    })
  )
  .output(
    z.object({
      jobUuid: z.string().describe('UUID of the deleted job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteJob(ctx.input.jobUuid);

    return {
      output: { jobUuid: ctx.input.jobUuid },
      message: `Deleted job **${ctx.input.jobUuid}**.`
    };
  })
  .build();
