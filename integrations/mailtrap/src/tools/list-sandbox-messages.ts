import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let listSandboxMessages = SlateTool.create(spec, {
  name: 'List Sandbox Messages',
  key: 'list_sandbox_messages',
  description: `List emails captured in a Mailtrap sandbox inbox. Use this to inspect test emails during development without sending to real recipients. Supports search and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Sandbox inbox ID'),
      search: z.string().optional().describe('Search term to filter messages'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.number().describe('Message ID'),
            subject: z.string().describe('Email subject'),
            fromEmail: z.string().describe('Sender email address'),
            fromName: z.string().optional().describe('Sender display name'),
            toEmail: z.string().describe('Recipient email address'),
            toName: z.string().optional().describe('Recipient display name'),
            isRead: z.boolean().describe('Whether the message has been read'),
            createdAt: z.string().describe('When the message was received')
          })
        )
        .describe('List of sandbox messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listSandboxMessages(ctx.input.inboxId, {
      search: ctx.input.search,
      page: ctx.input.page
    });

    let messages = (Array.isArray(result) ? result : []).map((m: any) => ({
      messageId: m.id,
      subject: m.subject || '',
      fromEmail: m.from_email || '',
      fromName: m.from_name,
      toEmail: m.to_email || '',
      toName: m.to_name,
      isRead: m.is_read || false,
      createdAt: m.created_at || ''
    }));

    return {
      output: { messages },
      message: `Found **${messages.length}** message(s) in sandbox inbox ${ctx.input.inboxId}.`
    };
  })
  .build();
