import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export let deleteAsyncJob = SlateTool.create(spec, {
  name: 'Delete Async Job Result',
  key: 'delete_async_job',
  description:
    'Delete a ConvertAPI asynchronous job retention record and confirm it is unavailable. This is result retention cleanup, not a cancellation or refund.',
  constraints: [
    'Use only a job you own. Deleting a processing job does not prove processing stopped. Output files have independent retention and must be deleted separately when their IDs are known.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({ jobId: z.string().describe('Exact job ID returned by convert_file_async') })
  )
  .output(
    z.object({
      jobId: z.string(),
      deleted: z.boolean(),
      beforeStatus: z.enum(['processing', 'completed', 'not_found']),
      absenceConfirmed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });
    const result = await client.deleteAsyncJob(ctx.input.jobId);
    return {
      output: { jobId: ctx.input.jobId, ...result },
      message: result.deleted
        ? 'Deleted the job retention record and confirmed it is unavailable. Processing and conversion credits are not reversed.'
        : 'The job record was already missing or expired; no deletion was performed.'
    };
  })
  .build();
