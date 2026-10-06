import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let getJobStream = SlateTool.create(spec, {
  key: 'get_job_stream',
  name: 'Get Job Stream',
  description:
    'Read currently available incremental output from a Serverless job whose handler supports streaming. Call again until the status is terminal. Use get_job_status for non-streaming handlers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      endpointId: z.string().min(1).describe('Endpoint ID from list_endpoints.'),
      jobId: z.string().min(1).describe('Job ID returned by run_job.')
    })
  )
  .output(z.object({ jobId: z.string(), status: z.string(), stream: z.array(z.any()) }))
  .handleInvocation(async ctx => {
    let client = new RunPodClient(ctx.auth);
    let result = await client.streamJob(ctx.input.endpointId, ctx.input.jobId);
    let stream = Array.isArray(result) ? result : result.stream;
    if (!Array.isArray(stream))
      throw createApiServiceError('Runpod returned an invalid job stream.');
    let status =
      result.status ??
      (await client.getJobStatus(ctx.input.endpointId, ctx.input.jobId)).status;
    return {
      output: { jobId: result.id ?? ctx.input.jobId, status, stream },
      message: `Retrieved streaming output for job ${ctx.input.jobId}: ${status}.`
    };
  })
  .build();
