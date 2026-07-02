import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelJob = SlateTool.create(spec, {
  name: 'Cancel Job',
  key: 'cancel_job',
  description: `Cancel a running job by its number. The job must be currently running to be cancelled.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe('Project slug in the format vcs-slug/org-name/repo-name'),
      jobNumber: z.number().describe('The job number to cancel')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.cancelJob(ctx.input.projectSlug, ctx.input.jobNumber);

    return {
      output: { success: true },
      message: `Job **#${ctx.input.jobNumber}** in project \`${ctx.input.projectSlug}\` has been **cancelled**.`
    };
  })
  .build();
