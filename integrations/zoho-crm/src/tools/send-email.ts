import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email from Zoho CRM associated with a specific record.
The email is logged against the record for tracking purposes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      module: z
        .string()
        .describe(
          'API name of the CRM module the record belongs to (e.g. "Leads", "Contacts")'
        ),
      recordId: z.string().describe('ID of the record to send email from'),
      fromName: z.string().describe('Sender display name'),
      fromEmail: z.string().describe('Sender email address (must be a configured CRM email)'),
      to: z
        .array(
          z.object({
            name: z.string().optional().describe('Recipient display name'),
            email: z.string().describe('Recipient email address')
          })
        )
        .min(1)
        .describe('Recipient list'),
      subject: z.string().describe('Email subject line'),
      content: z.string().describe('Email body content (HTML supported)'),
      mailFormat: z.enum(['text', 'html']).optional().describe('Email format (default: html)')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent successfully'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result = await client.sendEmail(ctx.input.module, ctx.input.recordId, {
      from: { userName: ctx.input.fromName, email: ctx.input.fromEmail },
      to: ctx.input.to.map(t => ({ userName: t.name, email: t.email })),
      subject: ctx.input.subject,
      content: ctx.input.content,
      mailFormat: ctx.input.mailFormat
    });

    let status = result?.data?.[0]?.status;
    let sent = status === 'success';

    return {
      output: { sent, message: result?.data?.[0]?.message },
      message: sent
        ? `Email sent to **${ctx.input.to.map(t => t.email).join(', ')}** from record **${ctx.input.recordId}**.`
        : `Failed to send email: ${result?.data?.[0]?.message || 'Unknown error'}.`
    };
  })
  .build();
