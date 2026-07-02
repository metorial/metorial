import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTemplate = SlateTool.create(spec, {
  name: 'Send Template',
  key: 'send_template',
  description: `Sends a pre-approved WhatsApp template message to a contact. Templates must be created via the Spoki platform UI and approved by Meta before use.
Can be used outside the 24-hour conversation window.`,
  instructions: [
    'Templates cannot be created via API; create them in the Spoki platform first.',
    'Contact details provided will automatically create or update the contact.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the Spoki template to send'),
      phone: z
        .string()
        .describe('Recipient phone number in E.164 format (e.g., +393331234567)'),
      firstName: z.string().optional().describe('First name of the recipient'),
      lastName: z.string().optional().describe('Last name of the recipient'),
      email: z.string().optional().describe('Email of the recipient'),
      language: z
        .string()
        .optional()
        .describe('Language code for the template (e.g., "en", "it")'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values to populate template variables')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message'),
      status: z.string().optional().describe('Delivery status'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info(`Sending template ${ctx.input.templateId} to ${ctx.input.phone}`);
    let result = await client.sendTemplate({
      templateId: ctx.input.templateId,
      phone: ctx.input.phone,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      language: ctx.input.language,
      customFields: ctx.input.customFields
    });

    return {
      output: {
        messageId: result?.id
          ? String(result.id)
          : result?.message_id
            ? String(result.message_id)
            : undefined,
        status: result?.status,
        raw: result
      },
      message: `Sent template **${ctx.input.templateId}** to **${ctx.input.phone}**`
    };
  })
  .build();
