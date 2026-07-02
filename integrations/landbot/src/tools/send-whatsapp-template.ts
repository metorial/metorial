import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let sendWhatsAppTemplateTool = SlateTool.create(spec, {
  name: 'Send WhatsApp Template',
  key: 'send_whatsapp_template',
  description: `Send a pre-approved WhatsApp message template to a customer. Templates must be approved by Meta before use. Supports dynamic parameters for header, body, and buttons.`,
  instructions: [
    'Use the "List WhatsApp Templates" tool to find available template IDs and their language codes.',
    'The customer must have opted in to receive WhatsApp messages.',
    'Optionally assign the customer to a bot after sending by providing botId.'
  ],
  constraints: [
    'Requires an official WhatsApp channel (not testing channels).',
    'Contacts must have opted in before receiving proactive messages.',
    'Templates must be pre-approved by Meta.'
  ]
})
  .input(
    z.object({
      customerId: z.number().describe('Numeric ID of the customer to send the template to'),
      templateId: z.number().describe('ID of the WhatsApp message template'),
      templateLanguage: z.string().describe('Language code of the template (e.g. "en", "es")'),
      headerParams: z
        .object({
          url: z.string().optional().describe('Media URL for header (image/document)'),
          filename: z.string().optional().describe('Filename for document headers'),
          params: z.array(z.string()).optional().describe('Variable parameters for the header')
        })
        .optional()
        .describe('Parameters for the template header'),
      bodyParams: z
        .array(z.string())
        .optional()
        .describe('Variable parameters for the template body'),
      buttonParams: z
        .array(
          z.object({
            params: z.array(z.string()).optional().describe('Parameters for this button')
          })
        )
        .optional()
        .describe('Parameters for template buttons'),
      botId: z.number().optional().describe('Bot ID to assign the customer to after sending'),
      blockId: z
        .string()
        .optional()
        .describe('Block ID within the bot to direct to after sending')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the template was sent successfully'),
      botAssigned: z
        .boolean()
        .describe('Whether the customer was assigned to a bot after sending')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);

    let templateParams: any;
    if (ctx.input.headerParams || ctx.input.bodyParams || ctx.input.buttonParams) {
      templateParams = {};
      if (ctx.input.headerParams) {
        templateParams.header = ctx.input.headerParams;
      }
      if (ctx.input.bodyParams) {
        templateParams.body = { params: ctx.input.bodyParams };
      }
      if (ctx.input.buttonParams) {
        templateParams.buttons = ctx.input.buttonParams;
      }
    }

    await client.sendWhatsAppTemplate(ctx.input.customerId, {
      templateId: ctx.input.templateId,
      templateLanguage: ctx.input.templateLanguage,
      templateParams
    });

    let botAssigned = false;
    if (ctx.input.botId) {
      await client.assignCustomerToBot(ctx.input.customerId, ctx.input.botId, {
        node: ctx.input.blockId
      });
      botAssigned = true;
    }

    return {
      output: {
        sent: true,
        botAssigned
      },
      message: `Sent WhatsApp template **#${ctx.input.templateId}** to customer **#${ctx.input.customerId}**${botAssigned ? ` and assigned to bot **#${ctx.input.botId}**` : ''}.`
    };
  });
