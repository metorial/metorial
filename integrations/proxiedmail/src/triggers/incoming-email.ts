import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let incomingEmail = SlateTrigger.create(spec, {
  name: 'Incoming Email',
  key: 'incoming_email',
  description:
    'Triggers when a new email is received at a proxy email address. Configure the webhook URL on your proxy email to receive real-time notifications.'
})
  .input(
    z.object({
      recipient: z.string().describe('Proxy email address that received the message'),
      sender: z.string().describe('Sender email address'),
      subject: z.string().describe('Email subject line'),
      bodyHtml: z.string().nullable().describe('HTML body of the email'),
      bodyPlain: z.string().nullable().describe('Plain text body of the email'),
      from: z.string().nullable().describe('Full From header value'),
      to: z.string().nullable().describe('Full To header value'),
      attachments: z.any().nullable().describe('Email attachments data'),
      rawPayload: z.any().describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      recipient: z.string().describe('Proxy email address that received the message'),
      sender: z.string().describe('Sender email address'),
      subject: z.string().describe('Email subject line'),
      bodyHtml: z.string().nullable().describe('HTML body of the email'),
      bodyPlain: z.string().nullable().describe('Plain text body of the email'),
      from: z.string().nullable().describe('Full From header (may include display name)'),
      to: z.string().nullable().describe('Full To header value'),
      attachments: z.any().nullable().describe('Email attachments data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body || typeof body !== 'object') {
        return { inputs: [] };
      }

      let recipient = body.recipient ?? body.To ?? '';
      let sender = body.sender ?? body.From ?? '';
      let subject = body.Subject ?? body.subject ?? '';
      let bodyHtml = body['body-html'] ?? null;
      let bodyPlain = body['body-plain'] ?? null;
      let from = body.From ?? body.from ?? null;
      let to = body.To ?? body.to ?? null;
      let attachments = body.attachments ?? null;

      return {
        inputs: [
          {
            recipient,
            sender,
            subject,
            bodyHtml,
            bodyPlain,
            from,
            to,
            attachments,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      let eventId = `${input.recipient}-${input.sender}-${input.subject}-${Date.now()}`;

      return {
        type: 'email.received',
        id: eventId,
        output: {
          recipient: input.recipient,
          sender: input.sender,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          bodyPlain: input.bodyPlain,
          from: input.from,
          to: input.to,
          attachments: input.attachments
        }
      };
    }
  })
  .build();
