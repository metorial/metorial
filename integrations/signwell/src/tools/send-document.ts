import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let sendDocument = SlateTool.create(spec, {
  name: 'Send Document',
  key: 'send_document',
  description: `Send a draft document to its recipients for signing. Use this to finalize and deliver a document that was created with draft mode enabled.`,
  instructions: ['The document must be in draft state to be sent.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the draft document to send'),
      name: z.string().optional().describe('Updated document name before sending'),
      subject: z.string().optional().describe('Updated email subject before sending'),
      message: z.string().optional().describe('Updated email message before sending'),
      expiresIn: z
        .number()
        .optional()
        .describe('Number of days before the signature request expires'),
      reminders: z
        .boolean()
        .optional()
        .describe('Enable or disable automatic signing reminders'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated document metadata before sending')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the sent document'),
      name: z.string().optional().describe('Name of the document'),
      status: z.string().optional().describe('Updated status of the document'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional().describe('ID of the recipient'),
            name: z.string().optional().describe('Name of the recipient'),
            email: z.string().optional().describe('Email of the recipient'),
            status: z.string().optional().describe('Signing status')
          })
        )
        .optional()
        .describe('Document recipients')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let { documentId, ...settings } = ctx.input;
    let result = await client.sendDocument(documentId, settings);

    let output = {
      documentId: result.id,
      name: result.name ?? undefined,
      status: result.status ?? undefined,
      recipients: result.recipients?.map(r => ({
        recipientId: r.id ?? undefined,
        name: r.name ?? undefined,
        email: r.email ?? undefined,
        status: r.status ?? undefined
      }))
    };

    return {
      output,
      message: `Document **${result.name || result.id}** has been sent to ${result.recipients?.length ?? 0} recipient(s).`
    };
  })
  .build();
