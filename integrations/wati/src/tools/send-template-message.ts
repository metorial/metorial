import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTemplateMessage = SlateTool.create(spec, {
  name: 'Send Template Message',
  key: 'send_template_message',
  description: `Send a pre-approved WhatsApp template message to a contact. Template messages can be sent at any time,
unlike session messages which require an active conversation window. Supports dynamic parameter substitution and optional scheduling for future delivery.`,
  instructions: [
    'Provide the template ID and the target phone number or contact ID.',
    'Use customParams to substitute template placeholders with dynamic values.',
    'Set scheduledAt to schedule the message for future delivery (ISO 8601 format).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the pre-approved message template to send.'),
      target: z
        .string()
        .describe(
          'Recipient: phone number with country code (e.g. 14155552671), contact ID, or Channel:PhoneNumber.'
        ),
      customParams: z
        .array(
          z.object({
            name: z.string().describe('Parameter name matching the template placeholder.'),
            value: z.string().describe('Value to substitute for the placeholder.')
          })
        )
        .optional()
        .describe('Dynamic parameter values for template placeholders.'),
      channel: z
        .string()
        .optional()
        .describe(
          'Specific channel name or phone number to send from. Defaults to primary channel.'
        ),
      scheduledAt: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp to schedule the message for future delivery. If omitted, sends immediately.'
        )
    })
  )
  .output(
    z.object({
      result: z.boolean().optional().describe('Whether the operation succeeded.'),
      messageId: z.string().optional().describe('ID of the sent message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let result: any;

    if (ctx.input.scheduledAt) {
      result = await client.scheduleTemplateMessage({
        templateId: ctx.input.templateId,
        target: ctx.input.target,
        scheduledAt: ctx.input.scheduledAt,
        customParams: ctx.input.customParams,
        channel: ctx.input.channel
      });
    } else {
      result = await client.sendTemplateMessage({
        templateId: ctx.input.templateId,
        target: ctx.input.target,
        customParams: ctx.input.customParams,
        channel: ctx.input.channel
      });
    }

    return {
      output: {
        result: result?.result,
        messageId: result?.messageId || result?.id
      },
      message: ctx.input.scheduledAt
        ? `Template message scheduled for **${ctx.input.target}** at ${ctx.input.scheduledAt}.`
        : `Template message sent to **${ctx.input.target}**.`
    };
  })
  .build();
