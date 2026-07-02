import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let replyToEmail = SlateTool.create(spec, {
  name: 'Reply to Email',
  key: 'reply_to_email',
  description: `Send a reply to an existing email thread. The reply is sent from the specified sending account to the specified recipient.`
})
  .input(
    z.object({
      replyToEmailId: z.string().describe('ID of the email to reply to.'),
      from: z.string().describe('Sending account email address to send the reply from.'),
      to: z.string().describe('Recipient email address.'),
      body: z.string().describe('Reply body content (HTML supported).'),
      cc: z.array(z.string()).optional().describe('CC email addresses.'),
      bcc: z.array(z.string()).optional().describe('BCC email addresses.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the reply was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.replyToEmail({
      replyToEmailId: ctx.input.replyToEmailId,
      from: ctx.input.from,
      to: ctx.input.to,
      body: ctx.input.body,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc
    });

    return {
      output: { success: true },
      message: `Replied to email from **${ctx.input.from}** to **${ctx.input.to}**.`
    };
  })
  .build();
