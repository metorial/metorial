import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursorId } from '../lib/client';
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
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum results to return (1-100)'),
      cursorId: z.string().optional().describe('Cursor ID returned by the previous page'),
      channelId: z.string().describe('Channel ID to list templates for')
    })
  )
  .output(
    z.object({
      nextCursorId: z.string().optional().describe('Cursor ID for fetching the next page'),
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

    let result = await client.listMessageTemplates(
      ctx.input.channelId,
      ctx.input.limit,
      ctx.input.cursorId
    );
    let data = result?.data || result;
    let templatesList = Array.isArray(data)
      ? data
      : data?.items || data?.templates || data?.data || [];

    let templates = templatesList.map((t: any) => ({
      templateName: t.name || t.templateName || '',
      templateLanguage: t.languageCode ?? t.language ?? undefined,
      templateStatus: t.status ?? undefined,
      category: t.category ?? undefined,
      components: t.components ?? undefined
    }));

    return {
      output: {
        templates,
        nextCursorId: nextCursorId(data)
      },
      message: `Found **${templates.length}** template(s) for channel **${ctx.input.channelId}**.`
    };
  })
  .build();
