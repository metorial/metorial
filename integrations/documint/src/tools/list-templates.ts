import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumintClient, mapTemplate } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve a page of document templates from your Documint account. Returns template names and IDs which can be used for document generation. Use this to discover templates before creating documents or updating a template.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1. Defaults to 1.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum records per page, from 1 to 200. Defaults to 100.'),
      sort: z
        .string()
        .optional()
        .describe(
          'Comma-separated fields to sort by; prefix a field with - for descending order, for example name,-createdAt.'
        ),
      name: z.string().optional().describe('Filter templates by exact name.')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier for the template.'),
            templateName: z.string().describe('Display name of the template.'),
            rawTemplate: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Full template object as returned by the API.')
          })
        )
        .describe('List of available templates.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocumintClient(ctx.auth.token);

    ctx.progress('Fetching templates from Documint...');

    let rawTemplates = await client.listTemplates(ctx.input);
    let templates = rawTemplates.map(t => mapTemplate(t));

    return {
      output: { templates },
      message: `Retrieved **${templates.length}** template(s) from Documint.${templates.length > 0 ? `\n\nTemplates:\n${templates.map(t => `- **${t.templateName}** (\`${t.templateId}\`)`).join('\n')}` : ''}`
    };
  })
  .build();
