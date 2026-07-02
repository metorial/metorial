import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmail = SlateTool.create(spec, {
  name: 'Get Email',
  key: 'get_email',
  description: `Retrieve the full content and metadata of a specific email by its message ID. Returns the email body (HTML), headers, sender/recipient info, and attachment details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Zoho Mail account ID'),
      folderId: z.string().describe('Folder ID where the email resides'),
      messageId: z.string().describe('Message ID of the email to retrieve'),
      includeBlockContent: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include block quote content from email threads')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID'),
      subject: z.string().optional().describe('Email subject'),
      fromAddress: z.string().optional().describe('Sender email address'),
      toAddress: z.string().optional().describe('Recipient email address'),
      ccAddress: z.string().optional().describe('CC recipients'),
      sender: z.string().optional().describe('Sender display name'),
      content: z.string().optional().describe('Email body content (HTML)'),
      receivedTime: z.string().optional().describe('Received timestamp (unix ms)'),
      sentDateInGMT: z.string().optional().describe('Sent date in GMT (unix ms)'),
      hasAttachment: z.boolean().optional().describe('Whether the email has attachments'),
      folderId: z.string().optional().describe('Folder ID'),
      threadId: z.string().optional().describe('Thread ID'),
      flagid: z.string().optional().describe('Flag status'),
      priority: z.string().optional().describe('Email priority'),
      size: z.number().optional().describe('Email size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let [metadata, contentData] = await Promise.all([
      client.getMessageMetadata(ctx.input.accountId, ctx.input.folderId, ctx.input.messageId),
      client.getMessageContent(
        ctx.input.accountId,
        ctx.input.folderId,
        ctx.input.messageId,
        ctx.input.includeBlockContent
      )
    ]);

    let combined = { ...(metadata || {}), ...(contentData || {}) };

    return {
      output: {
        messageId: String(ctx.input.messageId),
        subject: combined.subject,
        fromAddress: combined.fromAddress,
        toAddress: combined.toAddress,
        ccAddress: combined.ccAddress,
        sender: combined.sender,
        content: combined.content,
        receivedTime: combined.receivedTime ? String(combined.receivedTime) : undefined,
        sentDateInGMT: combined.sentDateInGMT ? String(combined.sentDateInGMT) : undefined,
        hasAttachment: combined.hasAttachment === '1' || combined.hasAttachment === true,
        folderId: combined.folderId ? String(combined.folderId) : undefined,
        threadId: combined.threadId ? String(combined.threadId) : undefined,
        flagid: combined.flagid ? String(combined.flagid) : undefined,
        priority: combined.priority,
        size: combined.size ? Number(combined.size) : undefined
      },
      message: `Retrieved email "**${combined.subject || 'No subject'}**" from ${combined.fromAddress || 'unknown sender'}.`
    };
  })
  .build();
