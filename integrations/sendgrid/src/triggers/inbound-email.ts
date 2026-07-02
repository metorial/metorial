import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let inboundEmail = SlateTrigger.create(spec, {
  name: 'Inbound Email',
  key: 'inbound_email',
  description:
    'Receives parsed inbound emails via the SendGrid Inbound Parse Webhook. Requires MX record configuration on your domain pointing to SendGrid.'
})
  .input(
    z.object({
      from: z.string().describe('Sender email address'),
      to: z.string().describe('Recipient email address(es)'),
      cc: z.string().optional().describe('CC addresses'),
      subject: z.string().optional().describe('Email subject'),
      text: z.string().optional().describe('Plain text email body'),
      html: z.string().optional().describe('HTML email body'),
      senderIp: z.string().optional().describe('IP address of the sending server'),
      envelope: z.string().optional().describe('JSON string of the SMTP envelope'),
      headers: z.string().optional().describe('Raw email headers'),
      attachments: z.number().optional().describe('Number of attachments'),
      spamScore: z.string().optional().describe('Spam score from SpamAssassin'),
      spamReport: z.string().optional().describe('Full spam report'),
      charsets: z.string().optional().describe('JSON string of character set encodings')
    })
  )
  .output(
    z.object({
      fromAddress: z.string().describe('Sender email address'),
      toAddress: z.string().describe('Recipient email address(es)'),
      ccAddress: z.string().optional().describe('CC addresses'),
      subject: z.string().optional().describe('Email subject'),
      textBody: z.string().optional().describe('Plain text email body'),
      htmlBody: z.string().optional().describe('HTML email body'),
      senderIp: z.string().optional().describe('Sender IP address'),
      attachmentCount: z.number().optional().describe('Number of attachments'),
      spamScore: z.string().optional().describe('SpamAssassin score')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      // Inbound Parse sends form-encoded data
      let contentType = ctx.request.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        // Parse URL-encoded form data
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      // Extract a unique ID from the headers or generate one
      let messageId = '';
      try {
        let headersStr = data.headers || '';
        let match = headersStr.match(/Message-ID:\s*<?([^>\s]+)/i);
        if (match) {
          messageId = match[1]!;
        }
      } catch {
        // ignore header parsing errors
      }

      if (!messageId) {
        messageId = `inbound_${data.from || ''}_${Date.now()}`;
      }

      return {
        inputs: [
          {
            from: data.from || '',
            to: data.to || '',
            cc: data.cc,
            subject: data.subject,
            text: data.text,
            html: data.html,
            senderIp: data.sender_ip,
            envelope: data.envelope,
            headers: data.headers,
            attachments: data.attachments ? Number.parseInt(data.attachments, 10) : 0,
            spamScore: data.spam_score,
            spamReport: data.spam_report,
            charsets: data.charsets
          }
        ]
      };
    },

    handleEvent: async ctx => {
      // Try to extract a unique message ID
      let messageId = '';
      try {
        let headersStr = ctx.input.headers || '';
        let match = headersStr.match(/Message-ID:\s*<?([^>\s]+)/i);
        if (match) {
          messageId = match[1]!;
        }
      } catch {
        // ignore
      }
      if (!messageId) {
        messageId = `inbound_${ctx.input.from}_${Date.now()}`;
      }

      return {
        type: 'email.received',
        id: messageId,
        output: {
          fromAddress: ctx.input.from,
          toAddress: ctx.input.to,
          ccAddress: ctx.input.cc,
          subject: ctx.input.subject,
          textBody: ctx.input.text,
          htmlBody: ctx.input.html,
          senderIp: ctx.input.senderIp,
          attachmentCount: ctx.input.attachments,
          spamScore: ctx.input.spamScore
        }
      };
    }
  });
