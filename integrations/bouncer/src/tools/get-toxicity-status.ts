import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getToxicityStatus = SlateTool.create(spec, {
  name: 'Get Toxicity Status',
  key: 'get_toxicity_status',
  description: `Check the status of a toxicity check job. Use this to determine whether the job has completed processing and results are ready for download.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The toxicity job ID returned from creating a toxicity check')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Toxicity job identifier'),
      createdAt: z.string().describe('ISO 8601 timestamp when the job was created'),
      status: z.string().describe('Current status: processing, completed, or error')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getToxicityJobStatus(ctx.input.jobId);

    return {
      output: {
        jobId: result.id,
        createdAt: result.createdAt,
        status: result.status
      },
      message: `Toxicity job **${result.id}**: status is **${result.status}**`
    };
  })
  .build();
