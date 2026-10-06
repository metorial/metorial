import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { jobOutputSchema, mapJob } from '../lib/mappers';
import { spec } from '../spec';
export const getJobTool = SlateTool.create(spec, {
  key: 'get_job',
  name: 'Get Job',
  description:
    'Retrieve a job and optionally its complete bounded interview plan. Returns relationship IDs; expanded v1 names, hiring-team details and openings are unavailable.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      jobId: z.string().describe('The Greenhouse job ID'),
      includeStages: z
        .boolean()
        .optional()
        .describe('Also fetch the interview stages for this job')
    })
  )
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    const client = new GreenhouseClient(ctx.auth, ctx.config);
    const raw = await client.getJob(ctx.input.jobId);
    const stages = ctx.input.includeStages
      ? (await client.getJobStages(ctx.input.jobId)).map(stage => ({
          stageId: String(stage.id),
          name: stage.name,
          priority: stage.sort_order,
          active: stage.active
        }))
      : undefined;
    return { output: { ...mapJob(raw), stages }, message: 'Retrieved the requested job.' };
  })
  .build();
