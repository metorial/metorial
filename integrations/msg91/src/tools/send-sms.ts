import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send SMS messages using a pre-approved template (flow). Supports variable substitution for personalization, scheduled delivery, URL shortening, Unicode content, and international messaging.`,
  instructions: [
    'Template ID (flow ID) must be created and approved in the MSG91 dashboard before use.',
    'Mobile numbers must include the country code (e.g., 919XXXXXXXXX for India).',
    'Variables in the template can be substituted by passing them as key-value pairs in each recipient object.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template/Flow ID from the MSG91 dashboard'),
      recipients: z
        .array(
          z
            .object({
              mobiles: z
                .string()
                .describe('Mobile number with country code (e.g., 919XXXXXXXXX)')
            })
            .catchall(z.string())
            .describe('Recipient with mobile number and optional template variables')
        )
        .describe('Array of recipients with their mobile numbers and template variables'),
      sender: z.string().optional().describe('Sender ID (if not defined in the flow)'),
      shortUrl: z
        .enum(['0', '1'])
        .optional()
        .describe('Enable URL shortening: "1" to enable, "0" to disable'),
      shortUrlExpiry: z.number().optional().describe('URL shortening expiry in seconds'),
      unicode: z
        .number()
        .optional()
        .describe('Set to 1 for non-English/Unicode content, 0 for English'),
      scheduleAt: z
        .string()
        .optional()
        .describe('Schedule time in "YYYY-MM-DD HH:mm:ss" format or Unix timestamp')
    })
  )
  .output(
    z.object({
      type: z.string().describe('Response status type (e.g., "success")'),
      message: z.string().describe('Request ID or response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.sendSms({
      templateId: ctx.input.templateId,
      recipients: ctx.input.recipients,
      sender: ctx.input.sender,
      shortUrl: ctx.input.shortUrl,
      shortUrlExpiry: ctx.input.shortUrlExpiry,
      unicode: ctx.input.unicode,
      scheduleAt: ctx.input.scheduleAt
    });

    return {
      output: {
        type: result.type || 'success',
        message: result.message || ''
      },
      message: `SMS sent to **${ctx.input.recipients.length}** recipient(s) using template \`${ctx.input.templateId}\`. Request ID: \`${result.message}\``
    };
  })
  .build();
