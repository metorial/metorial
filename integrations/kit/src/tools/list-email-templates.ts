import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmailTemplates = SlateTool.create(spec, {
  name: 'List Email Templates',
  key: 'list_email_templates',
  description: `List available email templates that can be used when creating broadcasts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.number().describe('Unique template ID'),
          name: z.string().describe('Template name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listEmailTemplates();
    let templates = result.data.map(t => ({
      templateId: t.id,
      name: t.name
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** email templates.`
    };
  })
  .build();
