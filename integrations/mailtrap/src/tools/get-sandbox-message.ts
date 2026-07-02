import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let getSandboxMessage = SlateTool.create(spec, {
  name: 'Get Sandbox Message',
  key: 'get_sandbox_message',
  description: `Retrieve detailed information about a specific email in a sandbox inbox, including its HTML/text body, spam report, HTML analysis, and attachments. Can also mark messages as read, delete them, or forward them to a real email address.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Sandbox inbox ID'),
      messageId: z.string().describe('Message ID'),
      action: z
        .enum([
          'get',
          'get_html',
          'get_text',
          'spam_report',
          'html_analysis',
          'mark_read',
          'delete',
          'forward'
        ])
        .describe('What to do with the message'),
      forwardEmail: z
        .string()
        .optional()
        .describe('Email address to forward to (required for forward action)')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Message ID'),
      subject: z.string().optional().describe('Email subject'),
      fromEmail: z.string().optional().describe('Sender email'),
      toEmail: z.string().optional().describe('Recipient email'),
      htmlBody: z.string().optional().describe('HTML body of the email'),
      textBody: z.string().optional().describe('Plain text body of the email'),
      spamReport: z.any().optional().describe('Spam analysis report'),
      htmlAnalysis: z.any().optional().describe('HTML compatibility analysis'),
      isRead: z.boolean().optional().describe('Read status'),
      deleted: z.boolean().optional().describe('Whether the message was deleted'),
      forwarded: z.boolean().optional().describe('Whether the message was forwarded'),
      createdAt: z.string().optional().describe('When the message was received')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { inboxId, messageId, action, forwardEmail } = ctx.input;

    if (action === 'get') {
      let result = await client.getSandboxMessage(inboxId, messageId);
      return {
        output: {
          messageId: result.id?.toString(),
          subject: result.subject,
          fromEmail: result.from_email,
          toEmail: result.to_email,
          htmlBody: result.html_body,
          textBody: result.text_body,
          isRead: result.is_read,
          createdAt: result.created_at
        },
        message: `Retrieved message **"${result.subject}"** from ${result.from_email}.`
      };
    }

    if (action === 'get_html') {
      let html = await client.getSandboxMessageHtml(inboxId, messageId);
      return {
        output: {
          messageId,
          htmlBody: typeof html === 'string' ? html : JSON.stringify(html)
        },
        message: `Retrieved HTML body for message ${messageId}.`
      };
    }

    if (action === 'get_text') {
      let text = await client.getSandboxMessageText(inboxId, messageId);
      return {
        output: {
          messageId,
          textBody: typeof text === 'string' ? text : JSON.stringify(text)
        },
        message: `Retrieved text body for message ${messageId}.`
      };
    }

    if (action === 'spam_report') {
      let report = await client.getSandboxMessageSpamReport(inboxId, messageId);
      return {
        output: { messageId, spamReport: report },
        message: `Retrieved spam report for message ${messageId}.`
      };
    }

    if (action === 'html_analysis') {
      let analysis = await client.getSandboxMessageHtmlAnalysis(inboxId, messageId);
      return {
        output: { messageId, htmlAnalysis: analysis },
        message: `Retrieved HTML analysis for message ${messageId}.`
      };
    }

    if (action === 'mark_read') {
      await client.updateSandboxMessage(inboxId, messageId, true);
      return {
        output: { messageId, isRead: true },
        message: `Message ${messageId} marked as read.`
      };
    }

    if (action === 'delete') {
      await client.deleteSandboxMessage(inboxId, messageId);
      return {
        output: { messageId, deleted: true },
        message: `Message ${messageId} deleted.`
      };
    }

    if (action === 'forward') {
      if (!forwardEmail) throw new Error('forwardEmail is required for forwarding a message');
      await client.forwardSandboxMessage(inboxId, messageId, forwardEmail);
      return {
        output: { messageId, forwarded: true },
        message: `Message ${messageId} forwarded to **${forwardEmail}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
