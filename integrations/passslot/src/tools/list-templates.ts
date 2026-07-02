import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all pass templates in your PassSlot account. Returns template metadata including name, pass type, placeholder fields, and styling configuration. Use this to discover available templates before generating passes.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.number().describe('Unique template identifier'),
            name: z.string().describe('Template display name'),
            passType: z.string().describe('Pass type identifier'),
            formatVersion: z.number().optional().describe('Format version number'),
            placeholders: z
              .array(z.string())
              .optional()
              .describe('Dynamic placeholder field names'),
            passDescription: z
              .any()
              .optional()
              .describe('Full pass styling and field configuration')
          })
        )
        .describe('List of pass templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let templates = await client.listTemplates();

    let mapped = templates.map((t: any) => ({
      templateId: t.id,
      name: t.name,
      passType: t.passType,
      formatVersion: t.formatVersion,
      placeholders: t.placeholder,
      passDescription: t.description
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** template(s).`
    };
  })
  .build();
