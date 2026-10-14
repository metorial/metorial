import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Email Document',
  key: 'upload_document',
  description: `Upload an email or text document to a Parseur mailbox for processing. Provide the email content (HTML or plain text) along with metadata. Processing is asynchronous — the document will be queued for parsing.`,
  instructions: [
    'The recipient must be the mailbox email address (e.g. your-prefix@in.parseur.com). Use Get Mailbox to retrieve it.',
    'Provide subject and from, which the email API requires.',
    'Provide either bodyHtml or bodyPlain (HTML takes priority if both are provided).',
    'Processing is asynchronous. Use Get Document or List Documents to check status.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      recipient: z.string().describe('Mailbox email address returned by Get Mailbox'),
      subject: z
        .string()
        .optional()
        .describe('Email subject line (required by the email API)'),
      from: z.string().optional().describe('Sender email address (required by the email API)'),
      to: z.string().optional().describe('To recipients (comma-separated)'),
      cc: z.string().optional().describe('CC recipients (comma-separated)'),
      bcc: z.string().optional().describe('BCC recipients (comma-separated)'),
      bodyHtml: z
        .string()
        .optional()
        .describe('Email body in HTML format (takes priority over plain text)'),
      bodyPlain: z.string().optional().describe('Email body in plain text format')
    })
  )
  .output(
    z.object({
      submitted: z
        .boolean()
        .describe('Whether the document was successfully submitted for processing')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.subject || !ctx.input.from) {
      throw createApiServiceError(
        'subject and from are required to upload an email document.'
      );
    }
    if (!ctx.input.bodyHtml && !ctx.input.bodyPlain) {
      throw createApiServiceError(
        'Provide bodyHtml or bodyPlain to upload an email document.'
      );
    }
    let client = new Client({ token: ctx.auth.token });

    await client.uploadEmailDocument({
      recipient: ctx.input.recipient,
      subject: ctx.input.subject,
      from: ctx.input.from,
      to: ctx.input.to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      bodyHtml: ctx.input.bodyHtml,
      bodyPlain: ctx.input.bodyPlain
    });

    return {
      output: {
        submitted: true
      },
      message: `Email document submitted to **${ctx.input.recipient}** for processing.`
    };
  })
  .build();
