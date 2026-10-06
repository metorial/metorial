import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nonEmpty } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email through Close CRM associated with a lead. Supports sending, drafting, specifying recipients, CC/BCC, and using email templates.`,
  instructions: [
    'Provide **leadId**, **subject**, and **body** (HTML) at minimum.',
    'Set **status** to "draft" to save without sending, "outbox" (default) to queue for sending, or "sent" to log a previously sent email.',
    'Use **templateId** to apply an email template. The required subject/body override the template.',
    'Sending requires explicit to recipients and sender; omitted recipients are not inferred.',
    'Use sender and optionally emailAccountId to select a sending identity. Legacy sendAs is rejected rather than silently ignored.'
  ],
  tags: {
    destructive: true,
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
      sendAs: z
        .string()
        .optional()
        .describe(
          'Deprecated connected-account selector. Use sender and emailAccountId; a provided sendAs is rejected explicitly.'
        ),
      sender: z
        .string()
        .optional()
        .describe('Sender email address or display-name address. Required for outbox.'),
      emailAccountId: z
        .string()
        .optional()
        .describe(
          'Email account ID from get_current_user emailAccounts; use its identities to choose sender.'
        )
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('Unique identifier for the email activity'),
      leadId: z.string().optional().describe('Lead ID the email is associated with'),
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
    const input = ctx.input;
    const status = input.status ?? 'outbox';
    if (input.sendAs !== undefined)
      throw createApiServiceError(
        'sendAs is a legacy connected-account selector without a documented current mapping. Remove sendAs and explicitly choose sender and, if needed, emailAccountId.'
      );
    if (status === 'outbox' && (!input.sender || !input.to?.length))
      throw createApiServiceError(
        'Sending requires explicit sender and at least one to recipient. Use status=draft to save without sending.'
      );
    for (const address of [...(input.to ?? []), ...(input.cc ?? []), ...(input.bcc ?? [])])
      if (!z.email().safeParse(address).success)
        throw createApiServiceError('Provide valid recipient email addresses.');
    if (input.sender !== undefined) {
      nonEmpty(input.sender, 'sender');
      const address = input.sender.match(/^[^<>]*<([^<>]+)>$/)?.[1] ?? input.sender;
      if (!z.email().safeParse(address).success)
        throw createApiServiceError(
          'sender must be a valid email address, optionally with a display name.'
        );
    }
    const body = pickDefined({
      lead_id: input.leadId,
      contact_id: input.contactId,
      subject: input.subject,
      body_html: input.body,
      status,
      template_id: input.templateId,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      sender: input.sender,
      email_account_id: input.emailAccountId
    });
    const result = await new Client(ctx.auth).sendEmail(body);
    return {
      output: {
        emailId: result.id,
        leadId: result.lead_id ?? undefined,
        contactId: result.contact_id ?? undefined,
        subject: result.subject ?? undefined,
        body: result.body_html ?? result.body_text ?? undefined,
        status: result.status,
        sender: result.sender ?? undefined,
        to: result.to,
        cc: result.cc,
        bcc: result.bcc,
        dateCreated: result.date_created,
        threadId: result.thread_id ?? undefined
      },
      message: `Email activity **${result.id}** has status **${result.status}**. ${status === 'sent' ? 'Logged a previously sent email.' : status === 'draft' ? 'Saved without sending.' : 'A sending request was submitted; delivery is not confirmed.'}`
    };
  })
  .build();
