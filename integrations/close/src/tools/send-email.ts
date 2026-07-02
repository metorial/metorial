import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email through Close CRM associated with a lead. Supports sending, drafting, specifying recipients, CC/BCC, and using email templates.`,
  instructions: [
    'Provide **leadId**, **subject**, and **body** (HTML) at minimum.',
    'Set **status** to "draft" to save without sending, "outbox" (default) to queue for sending, or "sent" to log a previously sent email.',
    'Use **templateId** to apply an email template. The template subject/body will be used unless overridden.',
    "Specify **to**, **cc**, and **bcc** as arrays of email addresses. If **to** is omitted, Close sends to the lead's primary contact email.",
    'Use **sendAs** to send from a specific connected email account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('Lead ID to associate the email with'),
      contactId: z.string().optional().describe('Contact ID to associate the email with'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Email body in HTML format'),
      status: z
        .enum(['draft', 'outbox', 'sent'])
        .optional()
        .describe(
          'Email status: "draft" to save, "outbox" to queue for sending (default), "sent" to log as already sent'
        ),
      templateId: z.string().optional().describe('Email template ID to apply'),
      to: z.array(z.string()).optional().describe('Array of recipient email addresses'),
      cc: z.array(z.string()).optional().describe('Array of CC email addresses'),
      bcc: z.array(z.string()).optional().describe('Array of BCC email addresses'),
      sendAs: z.string().optional().describe('Connected account ID to send the email from')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('Unique identifier for the email activity'),
      leadId: z.string().describe('Lead ID the email is associated with'),
      contactId: z.string().optional().describe('Contact ID the email is associated with'),
      subject: z.string().optional().describe('Email subject line'),
      body: z.string().optional().describe('Email body in HTML'),
      status: z.string().describe('Email status (draft, outbox, sent, inbox, etc.)'),
      sender: z.string().optional().describe('Sender email address'),
      to: z.array(z.string()).describe('List of recipient email addresses'),
      cc: z.array(z.string()).describe('List of CC email addresses'),
      bcc: z.array(z.string()).describe('List of BCC email addresses'),
      dateCreated: z.string().describe('ISO 8601 timestamp when the email was created'),
      threadId: z.string().optional().describe('Email thread ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let emailData: Record<string, any> = {
      lead_id: ctx.input.leadId,
      subject: ctx.input.subject,
      body_html: ctx.input.body,
      status: ctx.input.status || 'outbox'
    };

    if (ctx.input.contactId) emailData.contact_id = ctx.input.contactId;
    if (ctx.input.templateId) emailData.template_id = ctx.input.templateId;
    if (ctx.input.to) emailData.to = ctx.input.to;
    if (ctx.input.cc) emailData.cc = ctx.input.cc;
    if (ctx.input.bcc) emailData.bcc = ctx.input.bcc;
    if (ctx.input.sendAs) emailData.send_as = ctx.input.sendAs;

    let result = await client.sendEmail(emailData);

    let toAddresses = (result.to || []).map((r: any) =>
      typeof r === 'string' ? r : r.email || r
    );
    let ccAddresses = (result.cc || []).map((r: any) =>
      typeof r === 'string' ? r : r.email || r
    );
    let bccAddresses = (result.bcc || []).map((r: any) =>
      typeof r === 'string' ? r : r.email || r
    );
    let senderAddress = result.sender
      ? typeof result.sender === 'string'
        ? result.sender
        : result.sender.email || result.sender
      : undefined;

    return {
      output: {
        emailId: result.id,
        leadId: result.lead_id,
        contactId: result.contact_id,
        subject: result.subject,
        body: result.body_html || result.body_text,
        status: result.status,
        sender: senderAddress,
        to: toAddresses,
        cc: ccAddresses,
        bcc: bccAddresses,
        dateCreated: result.date_created,
        threadId: result.thread_id
      },
      message: `Email ${result.status === 'draft' ? 'saved as draft' : 'queued for sending'} on lead \`${result.lead_id}\` with subject "${result.subject}".`
    };
  })
  .build();
