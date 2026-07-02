import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitDocument = SlateTool.create(spec, {
  name: 'Submit Document',
  key: 'submit_document',
  description: `Submit HTML or text content to a mailbox for parsing. Optionally include email metadata (from, to, subject). If both HTML and text are provided, HTML takes priority. You can also attach custom metadata for linking with external systems.`,
  instructions: [
    'Provide either **html** or **text** content (or both, where HTML takes priority).',
    'Use the **meta** field to attach custom metadata that will appear as `__meta__` in parsed output.'
  ]
})
  .input(
    z.object({
      mailboxId: z.string().describe('ID of the mailbox to submit the document to'),
      name: z.string().optional().describe('Name or label for the document'),
      html: z.string().optional().describe('HTML content to parse'),
      text: z.string().optional().describe('Plain text content to parse'),
      fromEmail: z.string().optional().describe('Sender email address (metadata)'),
      toEmail: z.string().optional().describe('Recipient email address (metadata)'),
      subject: z.string().optional().describe('Email subject (metadata)'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata to attach; will appear as __meta__ in parsed output')
    })
  )
  .output(
    z.object({
      documentId: z.string().optional().describe('ID of the created document'),
      status: z.string().optional().describe('Initial status of the submitted document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.submitHtmlDoc(ctx.input.mailboxId, {
      name: ctx.input.name,
      html: ctx.input.html,
      text: ctx.input.text,
      from: ctx.input.fromEmail,
      to: ctx.input.toEmail,
      subject: ctx.input.subject,
      meta: ctx.input.meta
    });

    return {
      output: {
        documentId: result?._id || result?.id,
        status: result?.status
      },
      message: `Submitted document to mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
