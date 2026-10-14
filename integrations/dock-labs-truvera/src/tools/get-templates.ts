import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplates = SlateTool.create(spec, {
  name: 'Get Credential Templates',
  key: 'get_templates',
  description:
    'List credential design templates or retrieve one by ID. Use the returned template ID when issuing a credential with a custom design.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      templateId: z
        .string()
        .optional()
        .describe('Template ID to retrieve. Omit to list templates'),
      offset: z.number().optional().describe('Non-negative whole-number pagination offset'),
      limit: z.number().optional().describe('Maximum results, from 1 to 64')
    })
  )
  .output(
    z.object({
      template: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Requested design template'),
      templates: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Design templates with IDs and names')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });
    if (ctx.input.templateId) {
      let template = await client.getTemplate(ctx.input.templateId);
      return {
        output: { template },
        message: `Retrieved template **${ctx.input.templateId}**.`
      };
    }
    let templates = await client.listTemplates({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    return { output: { templates }, message: `Found **${templates.length}** template(s).` };
  })
  .build();
