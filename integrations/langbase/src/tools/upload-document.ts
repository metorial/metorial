import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { documentContentFromInput } from './shared';

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Document',
  key: 'upload_document',
  description: `Upload or replace a document in a Langbase memory. Langbase returns a signed upload URL and the tool uploads the content to that URL, making the document available for memory processing and retrieval.`,
  constraints: [
    'Provide exactly one of contentBase64 or contentText.',
    'Supported MIME types include text/plain, text/markdown, text/csv, application/pdf, and spreadsheet formats.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memoryName: z.string().describe('Name of the memory to upload the document to'),
      documentName: z
        .string()
        .describe('Document name including extension, e.g. "notes.md" or "report.pdf"'),
      contentType: z.string().describe('MIME type for the uploaded document'),
      contentBase64: z.string().optional().describe('Base64-encoded document content'),
      contentText: z.string().optional().describe('UTF-8 text document content'),
      meta: z
        .record(z.string(), z.string())
        .optional()
        .describe('String metadata for the document, maximum 10 key-value pairs')
    })
  )
  .output(
    z.object({
      memoryName: z.string().describe('Memory the document was uploaded to'),
      documentName: z.string().describe('Uploaded document name'),
      ok: z.boolean().describe('Whether the signed URL upload succeeded'),
      status: z.number().describe('Signed URL upload HTTP status'),
      statusText: z.string().describe('Signed URL upload HTTP status text')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let content = documentContentFromInput(ctx.input);
    let result = await client.uploadDocument({
      memoryName: ctx.input.memoryName,
      documentName: ctx.input.documentName,
      contentType: ctx.input.contentType,
      meta: ctx.input.meta,
      ...content
    });

    return {
      output: {
        memoryName: ctx.input.memoryName,
        documentName: ctx.input.documentName,
        ok: result.ok,
        status: result.status,
        statusText: result.statusText
      },
      message: `Uploaded document **${ctx.input.documentName}** to memory **${ctx.input.memoryName}**.`
    };
  })
  .build();
