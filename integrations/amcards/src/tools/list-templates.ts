import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Browse available public card templates from AMcards. Optionally filter by category or search by name. To discover templates configured for sending cards, call list_quicksend_templates instead.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of templates in this page. Defaults to 25.'),
      skip: z
        .number()
        .optional()
        .describe('Number of templates to skip. Use nextSkip from a previous response.'),
      categoryId: z.number().optional().describe('Filter templates by category ID.'),
      nameContains: z
        .string()
        .optional()
        .describe('Search templates by name (case-insensitive partial match).')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().optional().describe('Template ID.'),
            name: z.string().optional().describe('Template name.'),
            category: z.string().optional().describe('Template category.')
          })
        )
        .describe('List of matching templates.'),
      totalCount: z.number().describe('Number of templates returned in this page.'),
      providerTotalCount: z
        .number()
        .optional()
        .describe('Total matching templates reported by AMcards.'),
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      rawResponse: z.any().optional().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.listPublicTemplates({
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      categoryId: ctx.input.categoryId,
      nameContains: ctx.input.nameContains
    });

    let templates = results.items.map(t => ({
      templateId: t.id != null ? String(t.id) : undefined,
      name: t.name ?? t.title ?? undefined,
      category:
        (typeof t.category === 'object' ? t.category?.title : t.category) ??
        t.category_name ??
        undefined
    }));

    return {
      output: {
        templates,
        totalCount: templates.length,
        providerTotalCount: results.providerTotalCount,
        nextSkip: results.nextSkip,
        rawResponse: results.rawResponse
      },
      message: `Found **${templates.length}** template(s)${ctx.input.nameContains ? ` matching "${ctx.input.nameContains}"` : ''}${ctx.input.categoryId ? ` in category ${ctx.input.categoryId}` : ''}.`
    };
  })
  .build();
