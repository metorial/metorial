import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getMessageResults } from '../lib/client';
import { messageResultSchema } from '../lib/schemas';
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
      sent: z.boolean().describe('Whether the email was accepted for sending'),
      requestId: z.string().optional().describe('Use get_message_status to check delivery'),
      results: z.array(messageResultSchema).optional().describe('Provider queue results')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.htmlText && !ctx.input.plainText) {
      throw createApiServiceError('Provide htmlText or plainText for the email content.');
    }
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, any> = {
      from: ctx.input.from,
      subject: ctx.input.subject,
      emails: [ctx.input.to]
    };

    payload.htmlText =
      ctx.input.htmlText ||
      `<pre>${ctx.input.plainText?.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</pre>`;
    if (ctx.input.plainText) payload.plainText = ctx.input.plainText;
    if (ctx.input.replyTo) payload.replyTo = ctx.input.replyTo;
    if (ctx.input.tags) payload.tags = ctx.input.tags;

    let results = getMessageResults(await client.sendEmail(payload));
    if (!results.length)
      throw createApiServiceError(
        'eSputnik returned no email queue result. Check the account before retrying.'
      );
    let rejected = results.find(result => result.status === 'ERROR');
    if (rejected)
      throw createApiServiceError(
        `eSputnik rejected the email: ${rejected.message || rejected.status}`
      );

    return {
      output: { sent: true, requestId: results[0]?.requestId, results },
      message: `Email accepted for sending to **${ctx.input.to}** with subject "${ctx.input.subject}".`
    };
  })
  .build();
