import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBackgroundJob = SlateTool.create(spec, {
  name: 'Get Background Job',
  key: 'get_background_job',
  description:
    'Read a submitted background job, including lead-move progress and status. Requires background-jobs:read or an equivalent broader scope. A failed job may still have partially changed resources; read back before retrying.',
  tags: { readOnly: true }
})
  .input(z.object({ jobId: z.string().describe('Job ID returned by move_leads.') }))
  .output(
    z.object({
      jobId: z.string(),
      workspaceId: z.string(),
      type: z.string(),
      status: z.string(),
      progress: z.number(),
      entityId: z.string().optional(),
      successCount: z.number().optional(),
      failedCount: z.number().optional(),
      totalToProcess: z.number().optional(),
      timestampCreated: z.string().optional(),
      timestampUpdated: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let job = await new Client(ctx.auth).getBackgroundJob(ctx.input.jobId);
    let data = job.data;
    return {
      output: {
        jobId: job.id,
        workspaceId: job.workspace_id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        entityId: job.entity_id ?? undefined,
        successCount: typeof data?.success_count === 'number' ? data.success_count : undefined,
        failedCount: typeof data?.failed_count === 'number' ? data.failed_count : undefined,
        totalToProcess:
          typeof data?.total_to_process === 'number' ? data.total_to_process : undefined,
        timestampCreated: job.created_at,
        timestampUpdated: job.updated_at
      },
      message: `Background job status: ${job.status}.`
    };
  })
  .build();
