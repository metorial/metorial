import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let duplicateJob = SlateTool.create(spec, {
  name: 'Duplicate Job',
  key: 'duplicate_job',
  description: `Create a copy of an existing job. The duplicated job will have the same structure (phases, items, milestones) as the original.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      jobId: z.number().describe('ID of the job to duplicate'),
      name: z
        .string()
        .optional()
        .describe('Name for the duplicated job. Uses original name if not provided.')
    })
  )
  .output(
    z.object({
      jobId: z.number().describe('ID of the newly created duplicate job'),
      name: z.string().describe('Name of the duplicate job'),
      raw: z.record(z.string(), z.any()).describe('Full duplicate job object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;

    let result = await client.duplicateJob(ctx.input.jobId, body);

    return {
      output: {
        jobId: result.id,
        name: result.name,
        raw: result
      },
      message: `Duplicated job ${ctx.input.jobId} as **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
