import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all available Promptmate.io templates. Templates are pre-built AI workflows for common tasks like content generation, SEO optimization, product descriptions, and competitor analysis. Use the "Use Template" tool to create an app from a template.`,
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
            templateName: z.string().describe('Name of the template'),
            description: z.string().optional().describe('Description of the template'),
            category: z.string().optional().describe('Category of the template')
          })
        )
        .describe('List of available templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let templates = await client.listTemplates();

    return {
      output: { templates },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();
