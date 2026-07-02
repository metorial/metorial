import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Lists project templates available in Rocketlane. Optionally retrieves full details of a specific template by ID. Templates can be used as a source when creating new projects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z
        .number()
        .optional()
        .describe('If provided, retrieves full details of this specific template'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of templates to return')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.number().describe('Template ID'),
            templateName: z.string().optional().describe('Template name')
          })
        )
        .optional()
        .describe('List of templates (when listing all)'),
      template: z.any().optional().describe('Full template details (when fetching by ID)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.templateId) {
      let template = await client.getTemplate(ctx.input.templateId);
      return {
        output: { template },
        message: `Retrieved template **${template.templateName || ctx.input.templateId}**.`
      };
    }

    let result = await client.listTemplates({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let templates = Array.isArray(result) ? result : (result.templates ?? result.data ?? []);

    return {
      output: { templates },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();
