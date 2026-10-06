import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid, pageInput, pagingOutput, perPageInput } from '../lib/response';
import { spec } from '../spec';
export let listReferenceData = SlateTool.create(spec, {
  key: 'list_reference_data',
  name: 'List Survey Reference Data',
  description:
    'Discover available survey templates, categories, or folders. Use exact returned IDs for survey creation and folder assignment. Returns one native page.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['survey_templates', 'survey_categories', 'survey_folders']),
      page: pageInput,
      perPage: perPageInput,
      language: z.string().optional(),
      category: z.string().optional()
    })
  )
  .output(
    z.object({
      resource: z.string(),
      items: z.array(z.record(z.string(), z.unknown())),
      page: z.number(),
      perPage: z.number(),
      total: z.number(),
      hasMore: z.boolean(),
      nextPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.resource === 'survey_folders' &&
      (ctx.input.language !== undefined || ctx.input.category !== undefined)
    )
      throw invalid('Folders do not accept language or category filters.');
    if (ctx.input.resource !== 'survey_templates' && ctx.input.category !== undefined)
      throw invalid('category applies only to survey_templates.');
    let result = await new Client(ctx.auth).listReferenceData(ctx.input.resource, ctx.input);
    return {
      output: { resource: ctx.input.resource, items: result.data, ...pagingOutput(result) },
      message: `Retrieved ${result.data.length} ${ctx.input.resource} from one page.`
    };
  })
  .build();
