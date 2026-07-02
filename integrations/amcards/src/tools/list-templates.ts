import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Browse available public card templates from AMcards. Optionally filter by category or search by name. Use the returned template IDs when sending cards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
      totalCount: z.number().describe('Total number of templates returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.listPublicTemplates({
      categoryId: ctx.input.categoryId,
      nameContains: ctx.input.nameContains
    });

    let templates = results.map((t: any) => ({
      templateId: t.id != null ? String(t.id) : undefined,
      name: t.name ?? undefined,
      category: t.category?.title ?? t.category_name ?? undefined
    }));

    return {
      output: {
        templates,
        totalCount: templates.length
      },
      message: `Found **${templates.length}** template(s)${ctx.input.nameContains ? ` matching "${ctx.input.nameContains}"` : ''}${ctx.input.categoryId ? ` in category ${ctx.input.categoryId}` : ''}.`
    };
  })
  .build();
