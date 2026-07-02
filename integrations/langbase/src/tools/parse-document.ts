import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { parseContentFromInput } from './shared';

export let parseDocument = SlateTool.create(spec, {
  name: 'Parse Document',
  key: 'parse_document',
  description: `Extract text content from a document using Langbase Parser. Useful before chunking text, embedding content, or loading a document into memory.`,
  constraints: [
    'Maximum file size is 10 MB.',
    'Provide exactly one of contentBase64 or contentText.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentName: z
        .string()
        .describe('Document name including extension, e.g. "notes.md" or "report.pdf"'),
      contentType: z.string().describe('MIME type for the document'),
      contentBase64: z.string().optional().describe('Base64-encoded document content'),
      contentText: z.string().optional().describe('UTF-8 text document content')
    })
  )
  .output(
    z.object({
      documentName: z.string().describe('Parsed document name'),
      contentLength: z.number().describe('Extracted content length in characters'),
      attachmentCount: z.number().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.parseDocument(
      ctx.input.documentName,
      ctx.input.contentType,
      parseContentFromInput(ctx.input)
    );
    let content = result.content ?? '';

    return {
      output: {
        documentName: result.documentName ?? ctx.input.documentName,
        contentLength: content.length,
        attachmentCount: content.length > 0 ? 1 : 0
      },
      attachments: content.length > 0 ? [createTextAttachment(content, 'text/plain')] : [],
      message: `Parsed **${result.documentName ?? ctx.input.documentName}** (${content.length} characters).`
    };
  })
  .build();
