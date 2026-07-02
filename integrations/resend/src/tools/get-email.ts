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

export let listSentEmails = SlateTool.create(spec, {
  name: 'List Sent Emails',
  key: 'list_sent_emails',
  description: `List emails sent by your Resend team. Returns references that can be passed to Get Email or the attachment tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results to return (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      emails: z
        .array(
          z.object({
            emailId: z.string().describe('Email ID.'),
            from: z.string().describe('Sender address.'),
            to: z.array(z.string()).describe('Recipient addresses.'),
            subject: z.string().describe('Email subject.'),
            cc: z.array(z.string()).optional().nullable().describe('CC recipients.'),
            bcc: z.array(z.string()).optional().nullable().describe('BCC recipients.'),
            replyTo: z.array(z.string()).optional().nullable().describe('Reply-to addresses.'),
            lastEvent: z.string().optional().nullable().describe('Last delivery event.'),
            createdAt: z.string().describe('When the email was created.'),
            scheduledAt: z.string().optional().nullable().describe('Scheduled delivery time.')
          })
        )
        .describe('List of sent emails.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSentEmails({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let emails = (result.data || []).map((email: any) => ({
      emailId: email.id,
      from: email.from,
      to: email.to,
      subject: email.subject,
      cc: email.cc,
      bcc: email.bcc,
      replyTo: email.reply_to,
      lastEvent: email.last_event,
      createdAt: email.created_at,
      scheduledAt: email.scheduled_at
    }));

    return {
      output: {
        emails,
        hasMore: result.has_more ?? false
      },
      message: `Found **${emails.length}** sent email(s).`
    };
  })
  .build();
