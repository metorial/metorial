import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmail = SlateTool.create(spec, {
  name: 'Get Email',
  key: 'get_email',
  description: `Retrieve details of a sent email by its ID, including delivery status, recipients, subject, content, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emailId: z.string().describe('ID of the email to retrieve.')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('ID of the email.'),
      from: z.string().describe('Sender address.'),
      to: z.array(z.string()).describe('Recipient addresses.'),
      subject: z.string().describe('Email subject.'),
      html: z.string().optional().nullable().describe('HTML content.'),
      text: z.string().optional().nullable().describe('Plain text content.'),
      cc: z.array(z.string()).optional().nullable().describe('CC recipients.'),
      bcc: z.array(z.string()).optional().nullable().describe('BCC recipients.'),
      replyTo: z.array(z.string()).optional().nullable().describe('Reply-to addresses.'),
      lastEvent: z
        .string()
        .optional()
        .nullable()
        .describe('Last delivery event (e.g., sent, delivered, bounced).'),
      createdAt: z.string().describe('When the email was created.'),
      scheduledAt: z.string().optional().nullable().describe('Scheduled delivery time.'),
      tags: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .nullable()
        .describe('Metadata tags.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let email = await client.getEmail(ctx.input.emailId);

    return {
      output: {
        emailId: email.id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        cc: email.cc,
        bcc: email.bcc,
        replyTo: email.reply_to,
        lastEvent: email.last_event,
        createdAt: email.created_at,
        scheduledAt: email.scheduled_at,
        tags: email.tags
      },
      message: `Email \`${email.id}\` to **${email.to?.join(', ')}** — last event: **${email.last_event || 'unknown'}**.`
    };
  })
  .build();
