import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let sendWhatsAppMessage = SlateTool.create(spec, {
  name: 'Send WhatsApp Message',
  key: 'send_whatsapp_message',
  description: `Send template-based WhatsApp messages to one or more recipients. Supports variable substitution for template components (body, buttons, headers).`,
  instructions: [
    'Template must be pre-approved by Meta/WhatsApp before sending.',
    'The integrated number must be onboarded via MSG91 WhatsApp Business.',
    'Mobile numbers must include the country code (e.g., 919XXXXXXXXX).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      integratedNumber: z
        .string()
        .describe('Your WhatsApp Business number registered with MSG91'),
      templateName: z.string().describe('Approved WhatsApp template name'),
      languageCode: z.string().describe('Template language code (e.g., "en", "en_US")'),
      namespace: z
        .string()
        .optional()
        .describe('Template namespace from WhatsApp Business Manager'),
      recipients: z
        .array(
          z.object({
            to: z
              .array(z.string())
              .describe('Array of recipient mobile numbers with country code'),
            components: z
              .record(z.string(), z.string())
              .optional()
              .describe(
                'Template component variables (e.g., {"body_1": "value", "button_1": "url"})'
              )
          })
        )
        .describe('Array of recipient groups with their template variables')
    })
  )
  .output(
    z.object({
      response: z.any().describe('API response from MSG91')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.sendWhatsAppTemplate({
      integratedNumber: ctx.input.integratedNumber,
      templateName: ctx.input.templateName,
      languageCode: ctx.input.languageCode,
      namespace: ctx.input.namespace,
      recipients: ctx.input.recipients
    });

    let totalRecipients = ctx.input.recipients.reduce((sum, r) => sum + r.to.length, 0);

    return {
      output: {
        response: result
      },
      message: `WhatsApp message sent to **${totalRecipients}** recipient(s) using template \`${ctx.input.templateName}\`.`
    };
  })
  .build();
