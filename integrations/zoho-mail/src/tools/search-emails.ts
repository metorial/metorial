import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchEmails = SlateTool.create(spec, {
  name: 'Search Emails',
  key: 'search_emails',
  description: `Search for emails in a Zoho Mail account using Zoho's search syntax. Supports searching by sender, recipient, subject, content, date range, and more. Use the search key syntax: \`parameter:value\` with \`::\` to combine conditions.

**Common search keys:**
- \`entire:keyword\` — Search all fields
- \`from:email@example.com\` — By sender
- \`to:email@example.com\` — By recipient
- \`subject:keyword\` — By subject
- \`newMails\` — Only new/unread emails
- \`hasAttachment:true\` — Emails with attachments`,
  constraints: ['Maximum 200 results per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Zoho Mail account ID'),
      searchKey: z
        .string()
        .describe(
          'Search query using Zoho Mail search syntax (e.g. "from:user@example.com", "subject:meeting", "newMails")'
        ),
      start: z
        .number()
        .optional()
        .default(1)
        .describe('Starting position for pagination (1-based)'),
      limit: z.number().optional().default(10).describe('Number of results to return (1-200)'),
      receivedBefore: z
        .number()
        .optional()
        .describe(
          'Unix timestamp in milliseconds — only return emails received before this time'
        ),
      includeTo: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include recipient details in results')
    })
  )
  .output(
    z.object({
      emails: z
        .array(
          z.object({
            messageId: z.string().describe('Message ID'),
            subject: z.string().optional().describe('Email subject'),
            sender: z.string().optional().describe('Sender name'),
            fromAddress: z.string().optional().describe('Sender email'),
            toAddress: z.string().optional().describe('Recipient email'),
            summary: z.string().optional().describe('Preview text'),
            folderId: z.string().optional().describe('Folder ID'),
            receivedTime: z.string().optional().describe('Received timestamp'),
            hasAttachment: z.boolean().optional(),
            threadId: z.string().optional()
          })
        )
        .describe('Matching emails'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let results = await client.searchMessages(ctx.input.accountId, {
      searchKey: ctx.input.searchKey,
      start: ctx.input.start,
      limit: ctx.input.limit,
      receivedTime: ctx.input.receivedBefore,
      includeto: ctx.input.includeTo
    });

    let emails = results.map((m: any) => ({
      messageId: String(m.messageId),
      subject: m.subject,
      sender: m.sender,
      fromAddress: m.fromAddress,
      toAddress: m.toAddress,
      summary: m.summary,
      folderId: m.folderId ? String(m.folderId) : undefined,
      receivedTime: m.receivedTime ? String(m.receivedTime) : undefined,
      hasAttachment: m.hasAttachment === '1' || m.hasAttachment === true,
      threadId: m.threadId ? String(m.threadId) : undefined
    }));

    return {
      output: {
        emails,
        count: emails.length
      },
      message: `Found **${emails.length}** email(s) matching search "${ctx.input.searchKey}".`
    };
  })
  .build();
