import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let inboundEmail = SlateTrigger.create(spec, {
  name: 'Inbound Email',
  key: 'inbound_email',
  description:
    'Receives parsed inbound emails from SendGrid Inbound Parse Webhook. Provides sender, recipients, subject, body content (HTML and plain text), headers, and attachment information.',
  instructions: [
    'Configure an MX record pointing to mx.sendgrid.net for your domain.',
    'Set up the Inbound Parse webhook in SendGrid Settings > Inbound Parse to point to the provided webhook URL.'
  ]
})
  .input(
    z.object({
      from: z.string().describe('Sender email address and name'),
      to: z.string().describe('Recipient email address(es)'),
      subject: z.string().describe('Email subject line'),
      text: z.string().optional().describe('Plain text body'),
      html: z.string().optional().describe('HTML body'),
      senderIp: z.string().optional().describe('IP address of the sending server'),
      envelope: z.string().optional().describe('JSON string of SMTP envelope (from/to)'),
      headers: z.string().optional().describe('Raw email headers'),
      attachmentCount: z.number().optional().describe('Number of attachments'),
      spamScore: z.string().optional().describe('Spam score from spam checking'),
      spamReport: z.string().optional().describe('Detailed spam report'),
      charsets: z.string().optional().describe('JSON string of character encodings used')
    })
  )
  .output(
    z.object({
      fromEmail: z.string().describe('Sender email address'),
      fromName: z.string().optional().describe('Sender display name'),
      toEmail: z.string().describe('Recipient email address(es)'),
      subject: z.string().describe('Email subject line'),
      textBody: z.string().optional().describe('Plain text email body'),
      htmlBody: z.string().optional().describe('HTML email body'),
      senderIp: z.string().optional().describe('IP address of the sending server'),
      attachmentCount: z.number().optional().describe('Number of attachments'),
      spamScore: z.number().optional().describe('Numeric spam score'),
      headers: z.string().optional().describe('Raw email headers')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      // Inbound Parse sends form data, but we receive it as the request body
      // The request may be multipart/form-data or application/x-www-form-urlencoded
      let contentType = ctx.request.headers.get('content-type') || '';
      let data: Record<string, any> = {};

      if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, any>;
      } else {
        // Parse as form data
        let formData = await ctx.request.formData();
        formData.forEach((value, key) => {
          data[key] = typeof value === 'string' ? value : value;
        });
      }

      let input = {
        from: data.from || '',
        to: data.to || '',
        subject: data.subject || '',
        text: data.text || undefined,
        html: data.html || undefined,
        senderIp: data.sender_ip || data.senderIp || undefined,
        envelope: data.envelope || undefined,
        headers: data.headers || undefined,
        attachmentCount: data.attachments ? Number.parseInt(data.attachments, 10) : undefined,
        spamScore: data.spam_score || undefined,
        spamReport: data.spam_report || undefined,
        charsets: data.charsets || undefined
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      // Parse the from field to extract email and name
      let fromEmail = ctx.input.from;
      let fromName: string | undefined;

      let fromMatch = ctx.input.from.match(/^(.+?)\s*<(.+?)>$/);
      if (fromMatch) {
        fromName = fromMatch[1]?.trim().replace(/^["']|["']$/g, '');
        fromEmail = fromMatch[2]?.trim() || ctx.input.from;
      }

      let spamScore: number | undefined;
      if (ctx.input.spamScore) {
        let parsed = Number.parseFloat(ctx.input.spamScore);
        spamScore = Number.isNaN(parsed) ? undefined : parsed;
      }

      // Generate a unique ID from from+to+subject+time
      let id = `inbound-${btoa(encodeURIComponent(`${ctx.input.from}-${ctx.input.to}-${ctx.input.subject}-${Date.now()}`)).slice(0, 40)}`;

      return {
        type: 'email.received',
        id,
        output: {
          fromEmail,
          fromName,
          toEmail: ctx.input.to,
          subject: ctx.input.subject,
          textBody: ctx.input.text || undefined,
          htmlBody: ctx.input.html || undefined,
          senderIp: ctx.input.senderIp || undefined,
          attachmentCount: ctx.input.attachmentCount || undefined,
          spamScore,
          headers: ctx.input.headers || undefined
        }
      };
    }
  })
  .build();
