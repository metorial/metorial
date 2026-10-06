import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { job } from '../lib/mappers';
import { field, malformed, numericId } from '../lib/validation';
import { spec } from '../spec';
export const getJobTool = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description:
    'Read exact job metadata and provider error details using the recipe ID and native job handle. Does not rerun, resume, cancel, or delete a job.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      recipeId: z.string().describe('Native recipe ID discovered with list_recipes.'),
      jobId: z.string().describe('Native job handle discovered with list_jobs.')
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      recipeId: z.number(),
      status: z.string(),
      isError: z.boolean().optional(),
      startedAt: z.string().nullable().optional(),
      completedAt: z.string().nullable().optional(),
      error: z.string().nullable().optional(),
      errorParts: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).getJob(ctx.input.recipeId, ctx.input.jobId);
    const output = job(result);
    if (
      output.jobId !== ctx.input.jobId ||
      String(output.recipeId) !== numericId(ctx.input.recipeId, 'recipeId')
    )
      malformed();
    return {
      output: {
        ...output,
        error: field(result, 'error', z.string().nullable().optional()),
        errorParts: field(result, 'error_parts', z.record(z.string(), z.unknown()).optional())
      },
      message: `Job ${output.jobId}: ${output.status}.`
    };
  });
