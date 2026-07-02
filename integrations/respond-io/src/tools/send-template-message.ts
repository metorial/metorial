import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTemplateMessage = SlateTool.create(spec, {
  name: 'Send Template Message',
  key: 'send_template_message',
  description: `Send a template message (e.g. WhatsApp template) to a contact. Templates must be pre-approved on the channel. Use the List Message Templates tool to find available templates and their required parameters.`,
  instructions: [
    'Template names and parameters must match what is configured on the channel.',
    'Use the List Message Templates tool to discover available templates.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to send the template message to'),
      channelId: z.string().describe('Channel ID for the template message'),
      templateName: z.string().describe('Name of the message template'),
      templateLanguage: z
        .string()
        .optional()
        .describe('Language code for the template (e.g. en, en_US)'),
      templateParameters: z
        .array(z.any())
        .optional()
        .describe('Template parameter values in order'),
      templateComponents: z
        .array(z.any())
        .optional()
        .describe('Template components (header, body, buttons) with their parameters')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent template message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let message: Record<string, any> = {
      type: 'whatsapp_template',
      template: {
        name: ctx.input.templateName
      }
    };

    if (ctx.input.templateLanguage) {
      message.template.language = ctx.input.templateLanguage;
    }
    if (ctx.input.templateParameters) {
      message.template.parameters = ctx.input.templateParameters;
    }
    if (ctx.input.templateComponents) {
      message.template.components = ctx.input.templateComponents;
    }

    let result = await client.sendMessage(ctx.input.contactId, message, ctx.input.channelId);
    let data = result?.data || result;

    return {
      output: {
        messageId: String(data?.id || data?.messageId || '')
      },
      message: `Sent template message **${ctx.input.templateName}** to contact **${ctx.input.contactId}** via channel **${ctx.input.channelId}**.`
    };
  })
  .build();
