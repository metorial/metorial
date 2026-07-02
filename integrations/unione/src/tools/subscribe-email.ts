import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscribeEmail = SlateTool.create(spec, {
  name: 'Resubscribe Email',
  key: 'resubscribe_email',
  description: `Send a re-subscribe email to a recipient who previously unsubscribed or was blocked due to complaints. The recipient will receive an email with a link to restore their subscription.`,
  constraints: ['Limited to once per day per recipient.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fromEmail: z.string().describe('Sender email address for the re-subscribe email'),
      fromName: z.string().describe('Sender display name'),
      toEmail: z.string().describe('Recipient email address to re-subscribe')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the re-subscribe email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.subscribeEmail({
      fromEmail: ctx.input.fromEmail,
      fromName: ctx.input.fromName,
      toEmail: ctx.input.toEmail
    });

    return {
      output: { success: result.status === 'success' },
      message: `Re-subscribe email sent to **${ctx.input.toEmail}**.`
    };
  })
  .build();
