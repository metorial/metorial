import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let sendTestEmail = SlateTool.create(spec, {
  name: 'Send Test Email',
  key: 'send_test_email',
  description:
    'Send a preview of an existing email message to verified recipient addresses before launching a campaign.',
  tags: { destructive: true }
})
  .input(
    z.object({
      messageId: z.number().describe('Message ID from create_email_message or list_messages'),
      email: z
        .string()
        .min(1)
        .describe('Verified recipient email addresses, separated by commas')
    })
  )
  .output(
    z.object({ result: z.any().describe('Test email send confirmation from Unisender') })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({ token: ctx.auth.token, locale: ctx.config.locale });
    let result = await client.sendTestEmail({
      id: ctx.input.messageId,
      email: ctx.input.email
    });
    return {
      output: { result },
      message: `Sent test email for message ${ctx.input.messageId} to ${ctx.input.email}`
    };
  })
  .build();
