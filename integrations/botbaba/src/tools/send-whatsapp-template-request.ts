import { SlateTool } from 'slates';
import { z } from 'zod';
import { BotbabaClient } from '../lib/client';
import { spec } from '../spec';

export let sendWhatsAppTemplateRequest = SlateTool.create(spec, {
  name: 'Send WhatsApp Template Request',
  key: 'send_whatsapp_template_request',
  description:
    'Submit a WhatsApp template message using the complete JSON request body copied from your Botbaba dashboard. Supports 360Dialog and Gupshup without altering the provider-specific template fields.',
  instructions: [
    'In your bot builder, open Actions → WhatsApp Users → Broadcast Template Message, choose the recipient, block and approved template, and use Copy Send Message Request.',
    'Pass the copied JSON object as requestBody and choose the WhatsApp provider configured for that bot.',
    'Submission does not confirm delivery. Your provider quota and template approval still apply.'
  ],
  constraints: [
    'Requires a WhatsApp Business API integration configured for your bot and an approved template.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      provider: z
        .enum(['360dialog', 'gupshup'])
        .describe('WhatsApp provider configured for the bot'),
      requestBody: z
        .record(z.string(), z.unknown())
        .describe('Complete JSON object copied using Copy Send Message Request in Botbaba')
    })
  )
  .output(
    z.object({
      response: z.unknown().describe('Botbaba response, or null for an empty response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BotbabaClient({ token: ctx.auth.token });
    let response = await client.sendWhatsAppTemplateRequest(
      ctx.input.provider,
      ctx.input.requestBody
    );

    return {
      output: { response },
      message: `WhatsApp template request submitted to Botbaba via **${ctx.input.provider}**.`
    };
  })
  .build();
