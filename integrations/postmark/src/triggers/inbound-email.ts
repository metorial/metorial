import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let inboundEmail = SlateTrigger.create(spec, {
  name: 'Inbound Email',
  key: 'inbound_email',
  description:
    'Triggers when Postmark receives and parses an inbound email at your configured inbound address. Delivers the full parsed email content including sender, recipients, subject, body, and attachments.'
})
  .input(
    z.object({
      messageId: z.string().describe('Postmark message ID.'),
      fromEmail: z.string().describe('Sender email address.'),
      fromName: z.string().optional().describe('Sender display name.'),
      toFull: z
        .array(
          z.object({
            email: z.string().describe('Recipient email.'),
            name: z.string().optional().describe('Recipient name.')
          })
        )
        .describe('Full To recipients.'),
      ccFull: z
        .array(
          z.object({
            email: z.string().describe('CC email.'),
            name: z.string().optional().describe('CC name.')
          })
        )
        .optional()
        .describe('CC recipients.'),
      subject: z.string().describe('Email subject.'),
      textBody: z.string().optional().describe('Plain text body.'),
      htmlBody: z.string().optional().describe('HTML body.'),
      strippedTextReply: z
        .string()
        .optional()
        .describe('Stripped reply text (without quoted content).'),
      date: z.string().describe('Email date.'),
      mailboxHash: z
        .string()
        .optional()
        .describe('Plus addressing hash from the inbound address.'),
      replyTo: z.string().optional().describe('Reply-To address.'),
      tag: z.string().optional().describe('Inbound tag.'),
      headers: z
        .array(
          z.object({
            name: z.string().describe('Header name.'),
            value: z.string().describe('Header value.')
          })
        )
        .optional()
        .describe('Email headers.'),
      attachments: z
        .array(
          z.object({
            name: z.string().describe('Attachment filename.'),
            contentType: z.string().describe('MIME type.'),
            contentLength: z.number().describe('Size in bytes.'),
            contentId: z.string().optional().describe('Content ID for inline attachments.')
          })
        )
        .optional()
        .describe('Email attachments (content not included, only metadata).')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Postmark message ID.'),
      fromEmail: z.string().describe('Sender email address.'),
      fromName: z.string().optional().describe('Sender display name.'),
      toRecipients: z
        .array(
          z.object({
            email: z.string().describe('Recipient email.'),
            name: z.string().optional().describe('Recipient name.')
          })
        )
        .describe('To recipients.'),
      ccRecipients: z
        .array(
          z.object({
            email: z.string().describe('CC email.'),
            name: z.string().optional().describe('CC name.')
          })
        )
        .optional()
        .describe('CC recipients.'),
      subject: z.string().describe('Email subject.'),
      textBody: z.string().optional().describe('Plain text body.'),
      htmlBody: z.string().optional().describe('HTML body.'),
      strippedTextReply: z.string().optional().describe('Stripped reply text.'),
      date: z.string().describe('Email date.'),
      mailboxHash: z.string().optional().describe('Plus addressing hash.'),
      replyTo: z.string().optional().describe('Reply-To address.'),
      tag: z.string().optional().describe('Inbound tag.'),
      attachmentCount: z.number().describe('Number of attachments.'),
      attachments: z
        .array(
          z.object({
            name: z.string().describe('Filename.'),
            contentType: z.string().describe('MIME type.'),
            contentLength: z.number().describe('Size in bytes.')
          })
        )
        .optional()
        .describe('Attachment metadata.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let toFull = (data.ToFull || []).map((r: any) => ({
        email: r.Email || '',
        name: r.Name || undefined
      }));

      let ccFull = (data.CcFull || []).map((r: any) => ({
        email: r.Email || '',
        name: r.Name || undefined
      }));

      let attachments = (data.Attachments || []).map((a: any) => ({
        name: a.Name || '',
        contentType: a.ContentType || '',
        contentLength: a.ContentLength || 0,
        contentId: a.ContentID || undefined
      }));

      let headers = (data.Headers || []).map((h: any) => ({
        name: h.Name || '',
        value: h.Value || ''
      }));

      return {
        inputs: [
          {
            messageId: data.MessageID || '',
            fromEmail: data.FromFull?.Email || data.From || '',
            fromName: data.FromFull?.Name || data.FromName || undefined,
            toFull,
            ccFull: ccFull.length > 0 ? ccFull : undefined,
            subject: data.Subject || '',
            textBody: data.TextBody || undefined,
            htmlBody: data.HtmlBody || undefined,
            strippedTextReply: data.StrippedTextReply || undefined,
            date: data.Date || '',
            mailboxHash: data.MailboxHash || undefined,
            replyTo: data.ReplyTo || undefined,
            tag: data.Tag || undefined,
            headers: headers.length > 0 ? headers : undefined,
            attachments: attachments.length > 0 ? attachments : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'email.received',
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          fromEmail: ctx.input.fromEmail,
          fromName: ctx.input.fromName,
          toRecipients: ctx.input.toFull,
          ccRecipients: ctx.input.ccFull,
          subject: ctx.input.subject,
          textBody: ctx.input.textBody,
          htmlBody: ctx.input.htmlBody,
          strippedTextReply: ctx.input.strippedTextReply,
          date: ctx.input.date,
          mailboxHash: ctx.input.mailboxHash,
          replyTo: ctx.input.replyTo,
          tag: ctx.input.tag,
          attachmentCount: ctx.input.attachments?.length ?? 0,
          attachments: ctx.input.attachments?.map(a => ({
            name: a.name,
            contentType: a.contentType,
            contentLength: a.contentLength
          }))
        }
      };
    }
  });
