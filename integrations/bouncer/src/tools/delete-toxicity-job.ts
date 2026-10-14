import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteToxicityJob = SlateTool.create(spec, {
  name: 'Delete Toxicity Job',
  key: 'delete_toxicity_job',
  description:
    'Delete a toxicity check job and its stored email list and results from Bouncer.',
  instructions: [
    'Download any results you need with get_toxicity_results before deleting the job.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      jobId: z.string().describe('Toxicity job ID returned by check_toxicity')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Deleted toxicity job identifier'),
      deleted: z.boolean().describe('Whether Bouncer confirmed deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteToxicityJob(ctx.input.jobId);

    return {
      output: { jobId: ctx.input.jobId, deleted: true },
      message: `Deleted toxicity job **${ctx.input.jobId}**.`
    };
  })
  .build();
