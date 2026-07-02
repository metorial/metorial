import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email from a Zoho Mail account. Supports HTML and plain text, CC/BCC recipients, read receipts, and scheduled sending. Can also be used to reply to an existing email by providing the original message ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Zoho Mail account ID to send from'),
      fromAddress: z
        .string()
        .describe('Sender email address (must belong to the authenticated account)'),
      toAddress: z
        .string()
        .describe('Recipient email address(es), comma-separated for multiple'),
      ccAddress: z
        .string()
        .optional()
        .describe('CC recipient email address(es), comma-separated'),
      bccAddress: z
        .string()
        .optional()
        .describe('BCC recipient email address(es), comma-separated'),
      subject: z.string().describe('Email subject line'),
      content: z.string().describe('Email body content (HTML or plain text)'),
      mailFormat: z
        .enum(['html', 'plaintext'])
        .optional()
        .default('html')
        .describe('Email content format'),
      askReceipt: z.boolean().optional().describe('Request a read receipt from the recipient'),
      replyToMessageId: z
        .string()
        .optional()
        .describe('Message ID to reply to (makes this a reply instead of a new email)'),
      isSchedule: z
        .boolean()
        .optional()
        .describe('Whether to schedule the email for later sending'),
      scheduleTime: z
        .string()
        .optional()
        .describe(
          'Scheduled send time in MM/DD/YYYY HH:MM:SS format (requires isSchedule=true)'
        ),
      timeZone: z
        .string()
        .optional()
        .describe('Timezone for the scheduled send time (e.g. America/New_York)')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('ID of the sent message'),
      subject: z.string().optional().describe('Subject of the sent email'),
      fromAddress: z.string().optional().describe('Sender email address'),
      toAddress: z.string().optional().describe('Recipient email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let emailPayload: any = {
      fromAddress: ctx.input.fromAddress,
      toAddress: ctx.input.toAddress,
      subject: ctx.input.subject,
      content: ctx.input.content,
      mailFormat: ctx.input.mailFormat || 'html'
    };

    if (ctx.input.ccAddress) emailPayload.ccAddress = ctx.input.ccAddress;
    if (ctx.input.bccAddress) emailPayload.bccAddress = ctx.input.bccAddress;
    if (ctx.input.askReceipt) emailPayload.askReceipt = 'yes';
    if (ctx.input.isSchedule) {
      emailPayload.isSchedule = true;
      emailPayload.scheduleType = 6;
      if (ctx.input.scheduleTime) emailPayload.scheduleTime = ctx.input.scheduleTime;
      if (ctx.input.timeZone) emailPayload.timeZone = ctx.input.timeZone;
    }

    let result: any;
    if (ctx.input.replyToMessageId) {
      result = await client.replyToEmail(
        ctx.input.accountId,
        ctx.input.replyToMessageId,
        emailPayload
      );
    } else {
      result = await client.sendEmail(ctx.input.accountId, emailPayload);
    }

    let messageId = result?.messageId ? String(result.messageId) : undefined;

    return {
      output: {
        messageId,
        subject: ctx.input.subject,
        fromAddress: ctx.input.fromAddress,
        toAddress: ctx.input.toAddress
      },
      message: ctx.input.replyToMessageId
        ? `Reply sent to **${ctx.input.toAddress}** with subject "**${ctx.input.subject}**".`
        : `Email sent to **${ctx.input.toAddress}** with subject "**${ctx.input.subject}**".`
    };
  })
  .build();
