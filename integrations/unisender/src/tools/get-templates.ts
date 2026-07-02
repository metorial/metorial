import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplates = SlateTool.create(spec, {
  name: 'Get Email Templates',
  key: 'get_templates',
  description: `Retrieve email templates. Either get a specific template by ID or list all templates with optional filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z
        .number()
        .optional()
        .describe('Specific template ID to retrieve. Omit to list all templates.'),
      type: z.string().optional().describe('Filter by template type'),
      dateFrom: z
        .string()
        .optional()
        .describe('Filter templates created after this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Filter templates created before this date (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Maximum number of templates to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      template: z
        .any()
        .optional()
        .describe('Single template details (when templateId is provided)'),
      templates: z.any().optional().describe('List of templates (when listing all)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    if (ctx.input.templateId) {
      let template = await client.getTemplate(ctx.input.templateId);
      return {
        output: { template },
        message: `Retrieved template \`${ctx.input.templateId}\``
      };
    }

    let templates = await client.listTemplates({
      type: ctx.input.type,
      date_from: ctx.input.dateFrom,
      date_to: ctx.input.dateTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { templates },
      message: `Retrieved email templates`
    };
  })
  .build();
