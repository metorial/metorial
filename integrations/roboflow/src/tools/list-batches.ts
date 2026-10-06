import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export const listBatchesTool = SlateTool.create(spec, {
  name: 'List Image Batches',
  key: 'list_batches',
  description:
    'List uploaded image batches for a project, including IDs and names to use with create_annotation_job. Call list_projects to discover projects.',
  tags: { readOnly: true }
})
  .input(z.object({ projectId: projectIdSchema }))
  .output(
    z.object({
      batches: z.array(
        z.object({
          batchId: z.string().describe('Batch ID for create_annotation_job'),
          name: z.string().optional(),
          imageCount: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);
    const data = await client.listBatches(await client.getWorkspaceId(), ctx.input.projectId);
    const batches = (data.batches ?? []).map(
      (batch: { id: string; name?: string; images?: number }) => ({
        batchId: batch.id,
        name: batch.name,
        imageCount: batch.images
      })
    );
    return { output: { batches }, message: `Found **${batches.length}** image batch(es).` };
  })
  .build();
