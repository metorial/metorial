import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplatePages = SlateTool.create(spec, {
  name: 'List Template Pages',
  key: 'list_template_pages',
  description:
    'Discover page IDs and layer names in a multi-page template before creating a render. Returns the provider page objects, including their layer dictionaries.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      templateId: z.string().min(1).describe('Template ID from list_templates'),
      includeLockedLayers: z
        .boolean()
        .optional()
        .describe('Include locked layers; omitted defaults to false at the provider')
    })
  )
  .output(z.object({ pages: z.array(z.unknown()) }))
  .handleInvocation(async ctx => {
    let pages = await new Client(ctx.auth.token).getTemplatePages(
      ctx.input.templateId,
      ctx.input.includeLockedLayers
    );
    return {
      output: { pages },
      message: `Retrieved template pages for \`${ctx.input.templateId}\`.`
    };
  })
  .build();
