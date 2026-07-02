import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Search and list inspection templates available in your organization. Optionally filter by modification date. Use this to find template IDs for starting inspections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modifiedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter templates modified after this date')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique template identifier'),
            name: z.string().optional().describe('Template name'),
            description: z.string().optional().describe('Template description'),
            modifiedAt: z.string().optional().describe('Last modification timestamp')
          })
        )
        .describe('List of matching templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let templates = await client.searchTemplates({
      modifiedAfter: ctx.input.modifiedAfter
    });

    let mapped = templates.map((t: any) => ({
      templateId: t.template_id,
      name: t.name,
      description: t.description,
      modifiedAt: t.modified_at
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** templates.`
    };
  })
  .build();
