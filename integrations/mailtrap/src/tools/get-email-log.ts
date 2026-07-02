import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let getEmailLog = SlateTool.create(spec, {
  name: 'Get Email Log',
  key: 'get_email_log',
  description: `Get detailed information about a specific sent email by its message ID. Returns full delivery details including status, events (delivery, open, click, bounce, spam, etc.), and a temporary URL to download the raw message.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z.string().describe('UUID of the email message')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message UUID'),
      status: z.string().optional().describe('Delivery status'),
      subject: z.string().optional().describe('Email subject'),
      from: z.string().optional().describe('Sender email'),
      to: z.string().optional().describe('Recipient email'),
      sentAt: z.string().optional().describe('When the email was sent'),
      category: z.string().optional().describe('Email category'),
      sendingStream: z.string().optional().describe('Sending stream'),
      opensCount: z.number().optional().describe('Number of opens'),
      clicksCount: z.number().optional().describe('Number of clicks'),
      events: z
        .array(z.any())
        .optional()
        .describe('Delivery events (delivery, open, click, bounce, spam, etc.)'),
      rawMessageUrl: z
        .string()
        .optional()
        .describe('Temporary URL to download the raw .eml message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let m = await client.getEmailLog(ctx.input.messageId);

    return {
      output: {
        messageId: m.message_id || ctx.input.messageId,
        status: m.status,
        subject: m.subject,
        from: m.from,
        to: m.to,
        sentAt: m.sent_at,
        category: m.category,
        sendingStream: m.sending_stream,
        opensCount: m.opens_count,
        clicksCount: m.clicks_count,
        events: m.events,
        rawMessageUrl: m.raw_message_url
      },
      message: `Email **"${m.subject}"** to ${m.to} — Status: ${m.status}. ${m.opens_count || 0} opens, ${m.clicks_count || 0} clicks.`
    };
  })
  .build();
