import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateSchema = z.object({
  id: z.string().describe('Published template ID or alias to send.'),
  variables: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .optional()
    .describe('Template variables as key-value pairs.')
});

let emailSchema = z.object({
  from: z.string().describe('Sender email address.'),
  to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address(es).'),
  subject: z.string().describe('Email subject line.'),
  html: z.string().optional().describe('HTML content of the email.'),
  text: z.string().optional().describe('Plain text content of the email.'),
  cc: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('CC recipient(s).'),
  bcc: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('BCC recipient(s).'),
  replyTo: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Reply-to address(es).'),
  headers: z.record(z.string(), z.string()).optional().describe('Custom email headers.'),
  tags: z
    .array(
      z.object({
        name: z.string(),
        value: z.string()
      })
    )
    .optional()
    .describe('Metadata tags.'),
  template: templateSchema
    .optional()
    .describe('Published template to send. Do not provide html or text when template is set.'),
  scheduledAt: z.string().optional().describe('Schedule delivery time in ISO 8601 format.')
});

export let sendBatchEmails = SlateTool.create(spec, {
  name: 'Send Batch Emails',
  key: 'send_batch_emails',
  description: `Send multiple emails in a single API call. Each email can have different recipients, content, and settings. Use an idempotency key to prevent duplicate batch sends.`,
  constraints: ['Rate limited to 2 requests per second.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      emails: z.array(emailSchema).describe('Array of email objects to send.'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate batch sends.')
    })
  )
  .output(
    z.object({
      emailIds: z.array(z.string()).describe('IDs of the sent emails.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    for (let email of ctx.input.emails) {
      if (email.template && (email.html || email.text)) {
        throw createApiServiceError(
          'Do not provide html or text when sending a Resend template in a batch email.'
        );
      }
    }

    let result = await client.sendBatchEmails({
      emails: ctx.input.emails.map(e => ({
        from: e.from,
        to: e.to,
        subject: e.subject,
        html: e.html,
        text: e.text,
        cc: e.cc,
        bcc: e.bcc,
        replyTo: e.replyTo,
        headers: e.headers,
        tags: e.tags,
        template: e.template,
        scheduledAt: e.scheduledAt
      })),
      idempotencyKey: ctx.input.idempotencyKey
    });

    let ids = result.data.map((d: { id: string }) => d.id);

    return {
      output: {
        emailIds: ids
      },
      message: `Batch of **${ids.length}** emails sent successfully.`
    };
  })
  .build();
