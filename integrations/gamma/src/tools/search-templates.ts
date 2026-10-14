import { SlateTool } from 'slates';
import { z } from 'zod';
import { GammaClient } from '../lib/client';
import { spec } from '../spec';

let workspaceTemplateSchema = z.object({
  id: z
    .string()
    .describe(
      'Workspace template ID for generate_from_template; Gamma validates eligibility at generation time'
    ),
  title: z.string().nullable(),
  url: z.string(),
  previewUrl: z.string().nullable()
});

export let searchTemplatesTool = SlateTool.create(spec, {
  name: 'Search Templates',
  key: 'search_templates',
  description:
    'Find workspace templates for generate_from_template and browse official Gamma explore templates. Returns the two template collections separately.',
  instructions: [
    'Omit query to browse templates; provide query for best-effort relevance ranking.',
    'Only workspace template IDs can be passed to generate_from_template. Explore template IDs are not accepted.',
    'Gamma may reject multi-page or site-bound workspace templates during generation.',
    'workspaceDegraded means workspace results fell back to last-edited browse order.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: z
        .string()
        .max(2000)
        .optional()
        .describe('Optional template search query, up to 2000 characters'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(25)
        .optional()
        .describe('Maximum results per collection, from 1 to 25')
    })
  )
  .output(
    z.object({
      workspaceTemplates: z.array(workspaceTemplateSchema),
      exploreTemplates: z.array(
        workspaceTemplateSchema.extend({
          id: z
            .string()
            .describe('Official explore template ID; not accepted by generate_from_template'),
          thumbnailUrl: z.string().nullable()
        })
      ),
      workspaceDegraded: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GammaClient(ctx.auth.token);
    let result = await client.searchTemplates({ q: ctx.input.query, limit: ctx.input.limit });
    return {
      output: result,
      message: `Found **${result.workspaceTemplates.length}** workspace template(s) and **${result.exploreTemplates.length}** explore template(s).`
    };
  });
