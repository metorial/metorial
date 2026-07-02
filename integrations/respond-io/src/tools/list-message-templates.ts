import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessageTemplates = SlateTool.create(spec, {
  name: 'List Message Templates',
  key: 'list_message_templates',
  description: `List available message templates for a connected channel (e.g. WhatsApp templates). Use this to discover template names and parameters before sending template messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID to list templates for')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateName: z.string().describe('Template name'),
            templateLanguage: z.string().optional().describe('Template language code'),
            templateStatus: z.string().optional().describe('Approval status of the template'),
            category: z.string().optional().describe('Template category'),
            components: z
              .array(z.any())
              .optional()
              .describe('Template components (header, body, footer, buttons)')
          })
        )
        .describe('Available message templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMessageTemplates(ctx.input.channelId);
    let data = result?.data || result;
    let templatesList = Array.isArray(data) ? data : data?.templates || data?.data || [];

    let templates = templatesList.map((t: any) => ({
      templateName: t.name || t.templateName || '',
      templateLanguage: t.language,
      templateStatus: t.status,
      category: t.category,
      components: t.components
    }));

    return {
      output: {
        templates
      },
      message: `Found **${templates.length}** template(s) for channel **${ctx.input.channelId}**.`
    };
  })
  .build();
