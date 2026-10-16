import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplates = SlateTool.create(spec, {
  name: 'Get Templates',
  key: 'get_templates',
  description:
    'List survey templates or retrieve a template by ID, including its survey questions and stable question UUIDs. Find template IDs with get_campaigns or by listing templates.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      templateId: z
        .string()
        .optional()
        .describe('Template ID. Omit to list available templates.')
    })
  )
  .output(
    z.object({
      templates: z
        .array(z.any())
        .describe('Templates, including full question details when a template ID is supplied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let templates = ctx.input.templateId
      ? [await client.getTemplate(ctx.input.templateId)]
      : (await client.getTemplates()).templates;
    return {
      output: { templates },
      message: `Retrieved **${templates.length}** template(s).`
    };
  })
  .build();
