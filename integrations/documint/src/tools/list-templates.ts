import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocumintClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve all available document templates from your Documint account. Returns template names and IDs which can be used for document generation (merging). Use this to discover which templates are available before creating documents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for paginated results.')
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

    let rawTemplates = await client.listTemplates(ctx.input.page);

    let templates = rawTemplates.map(t => ({
      templateId: String(t.id ?? t._id ?? ''),
      templateName: String(t.name ?? ''),
      rawTemplate: t
    }));

    return {
      output: { templates },
      message: `Retrieved **${templates.length}** template(s) from Documint.${templates.length > 0 ? `\n\nTemplates:\n${templates.map(t => `- **${t.templateName}** (\`${t.templateId}\`)`).join('\n')}` : ''}`
    };
  })
  .build();
