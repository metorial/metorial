import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export const getBulkJobStatus = SlateTool.create(spec, {
  name: 'Get Bulk Job Status',
  key: 'get_bulk_job_status',
  description:
    'Check the provider status of an asynchronous folder job. Pending jobs are still running; partial success requires inspecting the folder and cache state before retrying.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ jobId: z.string().describe('Exact job ID returned by manage_folders') }))
  .output(
    z.object({
      jobId: z.string(),
      type: z.string(),
      status: z.string(),
      purgeRequestId: z.string().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).getBulkJobStatus(
      ctx.input.jobId
    );
    return { output: result, message: `Bulk job status: **${result.status}**.` };
  })
  .build();
