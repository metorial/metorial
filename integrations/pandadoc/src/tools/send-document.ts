import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let sendDocument = SlateTool.create(spec, {
  name: 'Send Document',
  key: 'send_document',
  description: `Send a PandaDoc document to its recipients for viewing, signing, or approval. Optionally customize the email subject and message, or send silently for embedded signing flows.`,
  instructions: [
    'The document must be in "draft" status before sending.',
    'Use silent=true when building embedded signing experiences to avoid sending email notifications.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to send'),
      subject: z.string().optional().describe('Custom email subject line'),
      message: z.string().optional().describe('Custom email body message to recipients'),
      silent: z
        .boolean()
        .optional()
        .describe('If true, no email is sent — used for embedded signing. Defaults to false.'),
      senderEmail: z.string().optional().describe('Override the sender email address')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the document was successfully sent'),
      documentId: z.string().describe('UUID of the sent document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.sendDocument(ctx.input.documentId, {
      subject: ctx.input.subject,
      message: ctx.input.message,
      silent: ctx.input.silent,
      sender: ctx.input.senderEmail ? { email: ctx.input.senderEmail } : undefined
    });

    return {
      output: {
        sent: true,
        documentId: ctx.input.documentId
      },
      message: `Document \`${ctx.input.documentId}\` has been sent${ctx.input.silent ? ' silently (no email)' : ' to all recipients'}.`
    };
  })
  .build();
