import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitDocument = SlateTool.create(spec, {
  name: 'Submit Document',
  key: 'submit_document',
  description: `Submit HTML or text to a template-based or GPT-powered mailbox for asynchronous parsing. Optionally include email metadata. HTML takes priority over text. Use get_document to retrieve the result.`,
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
        documentId:
          typeof result === 'string' ? result : result?.doc_id || result?._id || result?.id,
        status: result?.status ?? undefined
      },
      message: `Submitted document to mailbox **${ctx.input.mailboxId}**.`
    };
  })
  .build();
