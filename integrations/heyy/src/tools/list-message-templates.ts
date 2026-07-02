import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessageTemplatesTool = SlateTool.create(spec, {
  name: 'List Message Templates',
  key: 'list_message_templates',
  description: `List all available WhatsApp message templates. Templates are Meta-approved message formats required for initiating WhatsApp conversations. Returns template IDs, names, statuses, categories, languages, and components. Use template IDs when sending template messages.`,
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
            templateId: z.string().describe('Unique identifier of the template'),
            name: z.string().describe('Template name'),
            status: z.string().describe('Template approval status'),
            category: z.string().nullable().optional().describe('Template category'),
            language: z.string().nullable().optional().describe('Template language'),
            components: z.array(z.any()).optional().describe('Template components'),
            createdAt: z.string().optional().describe('When the template was created'),
            updatedAt: z.string().optional().describe('When the template was last updated')
          })
        )
        .describe('List of message templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listMessageTemplates();

    let templates = (Array.isArray(result) ? result : (result?.templates ?? [])).map(
      (t: any) => ({
        templateId: t.id,
        name: t.name,
        status: t.status,
        category: t.category ?? null,
        language: t.language ?? null,
        components: t.components,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      })
    );

    return {
      output: { templates },
      message: `Found **${templates.length}** message template(s).`
    };
  })
  .build();
