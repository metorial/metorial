import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotbabaClient } from '../lib/client';
import { spec } from '../spec';

export let sendWhatsAppTemplate = SlateTool.create(spec, {
  name: 'Send WhatsApp Template',
  key: 'send_whatsapp_template',
  description: `Send a WhatsApp template message to a recipient via your Botbaba chatbot. Supports both **360Dialog** and **Gupshup** WhatsApp Business API providers.
Specify the recipient's mobile number (with country code), the template to use, and optionally a block to continue the conversation flow after the message is received.`,
  instructions: [
    'The mobile number must include the country code without any spaces, dashes, or plus sign (e.g., "919999999999" for India).',
    'The template name must match an approved WhatsApp template configured in your Botbaba account.',
    'You can find the exact template name and block name in your Botbaba bot builder under Actions → WhatsApp Users → Broadcast Template Message.',
    'Template parameters are key-value pairs that fill placeholders in the template body.'
  ],
  constraints: [
    'Requires a WhatsApp Business API integration (360Dialog or Gupshup) configured in your Botbaba account.',
    'Template must be pre-approved by WhatsApp before it can be sent.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      provider: z
        .enum(['360dialog', 'gupshup'])
        .describe('WhatsApp Business API provider configured in your Botbaba account'),
      mobileNumber: z
        .string()
        .describe(
          'Recipient mobile number with country code, no spaces or dashes (e.g., "919999999999")'
        ),
      templateName: z.string().describe('Name of the approved WhatsApp template to send'),
      blockName: z
        .string()
        .optional()
        .describe(
          'Bot block name to continue the conversation flow after the template message is received'
        ),
      templateParameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs for template body placeholder variables')
    })
  )
  .output(
    z.object({
      response: z
        .record(z.string(), z.unknown())
        .describe('Response from the Botbaba API after sending the template message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotbabaClient({
      token: ctx.auth.token
    });

    let result = await client.sendWhatsAppTemplate(ctx.input.provider, {
      mobileNumber: ctx.input.mobileNumber,
      templateName: ctx.input.templateName,
      blockName: ctx.input.blockName,
      templateParameters: ctx.input.templateParameters
    });

    return {
      output: {
        response: result
      },
      message: `WhatsApp template message **${ctx.input.templateName}** sent to **${ctx.input.mobileNumber}** via **${ctx.input.provider}**.`
    };
  })
  .build();
