import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid, scopes } from '../lib/schemas';
import { spec } from '../spec';

export const queryDocuments = SlateTool.create(spec, {
  name: 'Query Documents',
  key: 'query_documents',
  description:
    'Query a selected dataset with GROQ. Call list_projects and manage_datasets to discover scope. Results preserve the query shape; apply explicit GROQ ordering and slices to bound reads.',
  instructions: [
    'Use params for values referenced by $name in GROQ.',
    'For pagination, order by _id and filter _id > $lastId; no automatic count or completion marker is inferred.',
    'previewDrafts remains supported as the legacy drafts alias. Draft perspectives require the uncached API.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...scopes,
      query: z.string().min(1),
      params: z.record(z.string(), z.unknown()).optional(),
      perspective: z.enum(['published', 'previewDrafts', 'raw', 'drafts']).optional(),
      useCdn: z.boolean().optional()
    })
  )
  .output(z.object({ result: z.unknown(), ms: z.number().optional() }))
  .handleInvocation(async ctx => {
    if (
      ctx.input.useCdn &&
      (ctx.input.perspective === 'drafts' || ctx.input.perspective === 'previewDrafts')
    )
      throw invalid('Set useCdn to false for drafts or previewDrafts.');
    const result = await clientFor(ctx).query(ctx.input.query, ctx.input.params, {
      perspective: ctx.input.perspective,
      useCdn: ctx.input.useCdn
    });
    return {
      output: { result: result.result, ms: result.ms },
      message: 'Retrieved the native GROQ result.'
    };
  })
  .build();
