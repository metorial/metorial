import { SlateTool } from 'slates';
import { z } from 'zod';
import { jobMessage, readAndDeliver, taskSummary } from '../lib/jobs';
import { resourceId, taskOutput } from '../lib/schemas';
import { spec } from '../spec';
export const getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description:
    'Read an existing job with all task states and provide any finished export/url files. Pending and failed states remain explicit. Ended jobs and their data normally expire after 24 hours.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      jobId: resourceId,
      waitForCompletion: z
        .boolean()
        .optional()
        .default(false)
        .describe('Wait up to 60 seconds; the same job ID can be read again after a timeout.')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      status: z.string(),
      tag: z.string().optional(),
      createdAt: z.string().optional(),
      endedAt: z.string().optional(),
      tasks: z.array(taskOutput)
    })
  )
  .handleInvocation(async ctx => {
    const job = await readAndDeliver(ctx, ctx.input.jobId, ctx.input.waitForCompletion);
    return {
      output: {
        jobId: job.id,
        status: job.status,
        tag: job.tag,
        createdAt: job.created_at,
        endedAt: job.ended_at,
        tasks: job.tasks.map(taskSummary)
      },
      message: jobMessage(job, 'Processing')
    };
  })
  .build();
