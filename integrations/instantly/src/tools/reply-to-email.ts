import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { spec } from '../spec';

export let replyToEmail = SlateTool.create(spec, {
  name: 'Reply to Email',
  key: 'reply_to_email',
  description: `Send a real email reply to an existing thread from a connected sending account. The recipient must match the sender of the original message; this tool cannot send arbitrary new emails. Requires emails:read and emails:create permissions.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      replyToEmailId: z.string().describe('ID of the email to reply to.'),
      from: z.string().describe('Sending account email address to send the reply from.'),
      to: z.string().describe('Recipient email address.'),
      body: z.string().describe('Reply body content (HTML supported).'),
      subject: z
        .string()
        .optional()
        .describe(
          'Reply subject. If omitted, use the original email subject with a Re: prefix.'
        ),
      cc: z.array(z.string()).optional().describe('CC email addresses.'),
      bcc: z.array(z.string()).optional().describe('BCC email addresses.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the provider accepted the reply request'),
      emailId: z
        .string()
        .optional()
        .describe('Created email ID. Delivery is not confirmed by request acceptance.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let original = await client.getEmail(ctx.input.replyToEmailId);
    if (
      typeof original.from_address_email !== 'string' ||
      original.from_address_email.toLowerCase() !== ctx.input.to.toLowerCase()
    ) {
      throw invalid(
        'The recipient must match the original message sender. Choose the incoming email to reply to.'
      );
    }
    let subject = ctx.input.subject;
    if (subject === undefined) {
      if (typeof original.subject !== 'string')
        throw invalid('Provide a subject; the original email did not contain one.');
      subject = /^re:/i.test(original.subject) ? original.subject : `Re: ${original.subject}`;
    }

    let result = await client.replyToEmail({
      replyToEmailId: ctx.input.replyToEmailId,
      from: ctx.input.from,
      to: ctx.input.to,
      body: ctx.input.body,
      subject,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc
    });
    if (typeof result.id !== 'string')
      throw invalid(
        'Reply submission did not return an email identifier. Read the thread before retrying.'
      );

    return {
      output: { success: true, emailId: result.id },
      message: `The provider accepted the reply from **${ctx.input.from}** to **${ctx.input.to}**. Delivery is not confirmed.`
    };
  })
  .build();
