import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve all available design templates. Templates can be used when creating postcards, letters, or campaigns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID'),
            name: z.string().optional().describe('Template name'),
            size: z.string().optional().describe('Template size'),
            duplex: z.boolean().optional().describe('Whether the template is duplex')
          })
        )
        .describe('List of available templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.listTemplates();
    let templates = Array.isArray(result)
      ? result.map((t: any) => ({
          templateId: String(t.id),
          name: t.name,
          size: t.size,
          duplex: t.duplex
        }))
      : [];

    return {
      output: { templates },
      message: `Found **${templates.length}** templates.`
    };
  })
  .build();
