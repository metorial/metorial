import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailSchema = z.object({
  messageId: z.string().describe('Unique message identifier'),
  subject: z.string().optional().describe('Email subject'),
  sender: z.string().optional().describe('Sender display name'),
  fromAddress: z.string().optional().describe('Sender email address'),
  toAddress: z.string().optional().describe('Recipient email address'),
  summary: z.string().optional().describe('Email preview/summary text'),
  folderId: z.string().optional().describe('Folder ID containing the email'),
  receivedTime: z.string().optional().describe('Time the email was received (unix ms)'),
  sentDateInGMT: z.string().optional().describe('Sent date in GMT (unix ms)'),
  hasAttachment: z.boolean().optional().describe('Whether the email has attachments'),
  flagid: z.string().optional().describe('Flag status ID'),
  status2: z.string().optional().describe('Read/unread status'),
  threadId: z.string().optional().describe('Thread ID'),
  threadCount: z.number().optional().describe('Number of messages in the thread'),
  priority: z.string().optional().describe('Email priority'),
  size: z.number().optional().describe('Email size in bytes')
});

export let listEmails = SlateTool.create(spec, {
  name: 'List Emails',
  key: 'list_emails',
  description: `Retrieve a list of emails from a Zoho Mail folder. Returns email metadata including subject, sender, recipient, timestamps, and attachment info. Supports pagination and filtering by folder and flag status.`,
  constraints: ['Maximum 200 emails per request (limit parameter).'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Zoho Mail account ID'),
      folderId: z
        .string()
        .optional()
        .describe(
          'Folder ID to list emails from. If omitted, returns emails from all folders.'
        ),
      start: z
        .number()
        .optional()
        .default(1)
        .describe('Starting position for pagination (1-based)'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Number of emails to retrieve (1-200)'),
      includeTo: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include recipient details in the response'),
      threadedMails: z.boolean().optional().describe('Group emails by thread'),
      flagId: z.number().optional().describe('Filter by flag ID (0-9)')
    })
  )
  .output(
    z.object({
      emails: z.array(emailSchema).describe('List of email messages'),
      count: z.number().describe('Number of emails returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let messages = await client.listMessages(ctx.input.accountId, {
      folderId: ctx.input.folderId,
      start: ctx.input.start,
      limit: ctx.input.limit,
      includeto: ctx.input.includeTo,
      threadedMails: ctx.input.threadedMails,
      flagid: ctx.input.flagId
    });

    let emails = messages.map((m: any) => ({
      messageId: String(m.messageId),
      subject: m.subject,
      sender: m.sender,
      fromAddress: m.fromAddress,
      toAddress: m.toAddress,
      summary: m.summary,
      folderId: m.folderId ? String(m.folderId) : undefined,
      receivedTime: m.receivedTime ? String(m.receivedTime) : undefined,
      sentDateInGMT: m.sentDateInGMT ? String(m.sentDateInGMT) : undefined,
      hasAttachment: m.hasAttachment === '1' || m.hasAttachment === true,
      flagid: m.flagid ? String(m.flagid) : undefined,
      status2: m.status2 ? String(m.status2) : undefined,
      threadId: m.threadId ? String(m.threadId) : undefined,
      threadCount: m.threadCount ? Number(m.threadCount) : undefined,
      priority: m.priority,
      size: m.size ? Number(m.size) : undefined
    }));

    return {
      output: {
        emails,
        count: emails.length
      },
      message: `Retrieved **${emails.length}** email(s)${ctx.input.folderId ? ` from folder ${ctx.input.folderId}` : ''}.`
    };
  })
  .build();
