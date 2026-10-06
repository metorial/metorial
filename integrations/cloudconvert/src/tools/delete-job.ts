import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { deleteAndConfirm } from '../lib/deletion';
import { resourceId } from '../lib/schemas';
import { spec } from '../spec';
export const deleteJob = SlateTool.create(spec, {
  name: 'Delete Job',
  key: 'delete_job',
  description:
    'Delete an existing job including its tasks and stored file data. Confirms HTTP 204 and then an independent not-found read. Deletion is not a refund of credits already consumed.',
  tags: { destructive: true, readOnly: false }
})
  .input(z.object({ jobId: resourceId }))
  .output(z.object({ jobId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await deleteAndConfirm(clientFor(ctx), 'job', ctx.input.jobId);
    return {
      output: { jobId: ctx.input.jobId, deleted: true },
      message: `Job ${ctx.input.jobId} is no longer readable after deletion. Consumed credits are not refunded by this action.`
    };
  })
  .build();
