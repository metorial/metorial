import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send a one-off email message to a single recipient. Allows setting sender, subject, HTML/plain text content, reply-to address, and tags.
For sending prepared templates or multi-channel messages, use the **Send Prepared Message** tool instead.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z.string().describe('Recipient email address'),
      from: z.string().describe('Sender email address'),
      subject: z.string().describe('Email subject line'),
      htmlText: z.string().optional().describe('HTML content of the email'),
      plainText: z.string().optional().describe('Plain text content of the email'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      tags: z.array(z.string()).optional().describe('Tags for tracking and categorization')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, any> = {
      from: ctx.input.from,
      subject: ctx.input.subject,
      to: ctx.input.to
    };

    if (ctx.input.htmlText) payload.htmlText = ctx.input.htmlText;
    if (ctx.input.plainText) payload.plainText = ctx.input.plainText;
    if (ctx.input.replyTo) payload.replyTo = ctx.input.replyTo;
    if (ctx.input.tags) payload.tags = ctx.input.tags;

    await client.sendEmail(payload);

    return {
      output: { sent: true },
      message: `Email sent to **${ctx.input.to}** with subject "${ctx.input.subject}".`
    };
  })
  .build();
