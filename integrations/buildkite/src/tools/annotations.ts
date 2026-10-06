import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import {
  buildNumberSchema,
  organizationInput,
  paginationInput,
  paginationOutput,
  pipelineSlugSchema
} from '../lib/schemas';
import { spec } from '../spec';

const buildInput = {
  ...organizationInput,
  pipelineSlug: pipelineSlugSchema,
  buildNumber: buildNumberSchema
};
export const listAnnotations = SlateTool.create(spec, {
  key: 'list_annotations',
  name: 'List Annotations',
  description:
    'Read build annotations and rendered HTML for mutation readback or discovering IDs to delete. Requires read_builds.',
  tags: { readOnly: true }
})
  .input(z.object({ ...buildInput, ...paginationInput }))
  .output(
    z.object({
      ...paginationOutput,
      annotations: z.array(
        z.object({
          annotationId: z.string(),
          context: z.string(),
          style: z.string().nullable(),
          bodyHtml: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const rows = await client.listAnnotations(
      ctx.input.pipelineSlug,
      ctx.input.buildNumber,
      ctx.input
    );
    return {
      output: {
        annotations: rows.map(a => ({
          annotationId: a.id,
          context: a.context,
          style: a.style ?? null,
          bodyHtml: a.body_html,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        })),
        ...client.pagination
      },
      message: `Found ${rows.length} annotation(s).`
    };
  });
export const deleteAnnotation = SlateTool.create(spec, {
  key: 'delete_annotation',
  name: 'Delete Annotation',
  description:
    'Delete one build annotation identified by list_annotations. Requires write_builds.',
  tags: { destructive: true }
})
  .input(
    z.object({
      ...buildInput,
      annotationId: z.string().describe('Annotation UUID from list_annotations.')
    })
  )
  .output(z.object({ deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await createClient(ctx).deleteAnnotation(
      ctx.input.pipelineSlug,
      ctx.input.buildNumber,
      ctx.input.annotationId
    );
    return { output: { deleted: true }, message: 'Deleted the build annotation.' };
  });
