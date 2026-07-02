import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve available message templates configured in the Cardly business portal. Templates define text layout, styling (font, color, size, alignment), writing style, and support variable substitution (e.g. \`{{firstName}}\`) for personalization.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results (default 25)'),
      offset: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique template ID'),
            name: z.string().describe('Template name'),
            slug: z.string().describe('URL-friendly slug'),
            description: z.string().optional().describe('Template description'),
            style: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Template styling (font, color, size, alignment)'),
            variables: z
              .array(z.string())
              .optional()
              .describe('Variable placeholders available in this template'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('Available templates'),
      totalRecords: z.number().describe('Total number of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.listTemplates({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let templates = result.templates.map(t => ({
      templateId: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      style: t.style,
      variables: t.variables,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: {
        templates,
        totalRecords: result.meta.totalRecords
      },
      message: `Found **${templates.length}** template(s) (${result.meta.totalRecords} total).`
    };
  })
  .build();
