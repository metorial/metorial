import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobResult = SlateTool.create(spec, {
  name: 'Get Job Result',
  key: 'get_job_result',
  description: `Retrieve the result of an image processing job by its ID. Use this to poll for results when a processing job was started asynchronously or returned a non-complete status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Job hash/identifier returned from a processing request')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Processing status: complete, received, in_progress, or not_started'),
      jobId: z.string().describe('Job identifier'),
      resultUrl: z
        .string()
        .optional()
        .describe('URL to the processed image when status is complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getResult(ctx.input.jobId);

    let message =
      result.status === 'complete'
        ? `Job complete. Result: ${result.resultUrl}`
        : `Job status: **${result.status}**. Continue polling until complete.`;

    return {
      output: result,
      message
    };
  })
  .build();
