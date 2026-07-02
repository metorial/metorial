import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyGenClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all available video templates in your HeyGen account. Returns template IDs and names. Use "Get Template" to see the dynamic variables for a specific template.`,
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
            templateId: z.string().describe('Template ID'),
            name: z.string().describe('Template name'),
            thumbnailImageUrl: z.string().nullable().describe('Thumbnail image URL')
          })
        )
        .describe('List of available templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyGenClient({ token: ctx.auth.token });

    let result = await client.listTemplates();

    return {
      output: result,
      message: `Found **${result.templates.length}** templates.`
    };
  })
  .build();
