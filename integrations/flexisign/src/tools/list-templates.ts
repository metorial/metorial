import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexisignClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all reusable document templates in your FlexiSign account. Returns template IDs and names that can be used to retrieve details or send signature requests.`,
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
            templateId: z.string().describe('Unique identifier for the template'),
            templateName: z.string().describe('Display name of the template')
          })
        )
        .describe('List of available templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlexisignClient({ token: ctx.auth.token });

    let templates = await client.listTemplates();

    let mapped = templates.map(t => ({
      templateId: t.templateId,
      templateName: t.templateName
    }));

    return {
      output: {
        templates: mapped
      },
      message: `Found **${mapped.length}** template(s).`
    };
  })
  .build();
