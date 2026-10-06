import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAndRead, jobMessage, taskSummary } from '../lib/jobs';
import { tagInput, taskOutput } from '../lib/schemas';
import { validateTasks } from '../lib/validation';
import { spec } from '../spec';
export const createJob = SlateTool.create(spec, {
  name: 'Create Custom Job',
  key: 'create_job',
  description:
    'Create a custom job from documented named tasks. Task inputs reference other names in this job. Processing can consume credits; use a unique tag for recovery and download results before their 24-hour lifetime ends.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      tasks: z
        .record(z.string(), z.unknown())
        .describe(
          'Named task configuration objects, each with a documented operation. Names contain letters, numbers, hyphens, or underscores.'
        ),
      tag: tagInput,
      webhookUrl: z
        .string()
        .optional()
        .describe(
          'HTTP or HTTPS callback URL; job callbacks always send job.finished and job.failed.'
        ),
      webhookEvents: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy field: omit, or provide exactly job.finished and job.failed; custom job event selection is unsupported.'
        ),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Wait up to 60 seconds; use get_job to recover an existing job after a timeout.'
        )
    })
  )
  .output(z.object({ jobId: z.string(), status: z.string(), tasks: z.array(taskOutput) }))
  .handleInvocation(async ctx => {
    const job = await createAndRead(ctx, validateTasks(ctx.input.tasks), ctx.input);
    return {
      output: { jobId: job.id, status: job.status, tasks: job.tasks.map(taskSummary) },
      message: jobMessage(job, 'Custom processing')
    };
  })
  .build();
