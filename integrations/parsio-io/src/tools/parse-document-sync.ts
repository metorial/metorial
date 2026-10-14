import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let parseDocumentSync = SlateTool.create(spec, {
  name: 'Parse Document Synchronously',
  key: 'parse_document_sync',
  description:
    'Submit HTML or text to a template-based or GPT-powered mailbox and wait for parsed JSON. If parsing continues in the background, use get_document with the returned documentId.',
  instructions: [
    'Provide non-empty html or text. HTML takes priority when both are provided.',
    'AI-powered parsers and OCR converters require file uploads instead of this text/HTML endpoint.'
  ]
})
  .input(
    z.object({
      mailboxId: z
        .string()
        .min(1)
        .describe('Mailbox ID; discover mailboxes with list_mailboxes'),
      name: z.string().optional().describe('Document name or email subject'),
      html: z.string().optional().describe('HTML content to parse'),
      text: z.string().optional().describe('Plain text content to parse'),
      fromEmail: z.string().optional().describe('Sender email address'),
      toEmail: z.string().optional().describe('Recipient email address'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata included in parsed data as __meta__')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID for fetching results later'),
      parsingInProgress: z.boolean().describe('Whether parsing continues in the background'),
      status: z.string().optional().describe('Current document status'),
      name: z.string().optional().describe('Document name when available'),
      contentType: z.string().optional().describe('Document media type when available'),
      createdAt: z.string().optional().describe('Document creation timestamp when available'),
      processedAt: z.string().optional().describe('Processing timestamp when available'),
      parsedData: z
        .unknown()
        .optional()
        .describe('Extracted JSON, null while parsing is in progress')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.submitHtmlDocSync(ctx.input.mailboxId, {
      name: ctx.input.name,
      html: ctx.input.html,
      text: ctx.input.text,
      from: ctx.input.fromEmail,
      to: ctx.input.toEmail,
      meta: ctx.input.meta
    });
    if (
      typeof result?.doc_id !== 'string' ||
      typeof result?.parsing_in_progress !== 'boolean'
    ) {
      throw createApiServiceError(
        'Parsio returned an unexpected synchronous parsing response.',
        {
          reason: 'invalid_parsing_response'
        }
      );
    }
    return {
      output: {
        documentId: result.doc_id,
        parsingInProgress: result.parsing_in_progress,
        status: result.status ?? undefined,
        name: result.name ?? undefined,
        contentType: result.content_type ?? undefined,
        createdAt: result.created_at ?? undefined,
        processedAt: result.processed_at ?? undefined,
        parsedData: result.json
      },
      message: result.parsing_in_progress
        ? 'Document accepted; parsing continues in the background. Use get_document to retrieve the result.'
        : 'Document processed; retrieved the parsing result.'
    };
  })
  .build();
