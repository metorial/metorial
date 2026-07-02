import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email through EspoCRM. The email can be associated with a parent record (Contact, Account, Lead, etc.) and can include attachments by their IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject'),
      body: z.string().describe('Email body (HTML supported)'),
      isHtml: z.boolean().optional().describe('Whether the body is HTML (defaults to true)'),
      cc: z.string().optional().describe('CC email address'),
      bcc: z.string().optional().describe('BCC email address'),
      from: z.string().optional().describe('Sender email address (if different from default)'),
      parentType: z
        .string()
        .optional()
        .describe('Parent entity type to link this email to (e.g., Contact, Account, Lead)'),
      parentId: z.string().optional().describe('Parent record ID to link this email to'),
      attachmentIds: z
        .array(z.string())
        .optional()
        .describe('IDs of previously uploaded attachments to include')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('ID of the sent email record'),
      status: z.string().optional().describe('Email status'),
      dateSent: z.string().optional().describe('Date/time the email was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let emailData: Record<string, any> = {
      to: ctx.input.to,
      subject: ctx.input.subject,
      body: ctx.input.body,
      isHtml: ctx.input.isHtml !== false
    };

    if (ctx.input.cc) emailData.cc = ctx.input.cc;
    if (ctx.input.bcc) emailData.bcc = ctx.input.bcc;
    if (ctx.input.from) emailData.from = ctx.input.from;
    if (ctx.input.parentType) emailData.parentType = ctx.input.parentType;
    if (ctx.input.parentId) emailData.parentId = ctx.input.parentId;
    if (ctx.input.attachmentIds && ctx.input.attachmentIds.length > 0) {
      emailData.attachmentsIds = ctx.input.attachmentIds;
    }

    let result = await client.sendEmail(emailData);

    return {
      output: {
        emailId: result.id,
        status: result.status,
        dateSent: result.dateSent
      },
      message: `Email sent to **${ctx.input.to}** with subject "${ctx.input.subject}".`
    };
  })
  .build();
