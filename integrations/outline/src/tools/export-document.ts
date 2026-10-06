import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { requireValue } from '../lib/validation';
import { spec } from '../spec';
export const exportDocument = SlateTool.create(spec, {
  name: 'Export Document',
  key: 'export_document',
  description:
    'Download one document as a Markdown file. This excludes child documents and does not bundle embedded files.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z.string().describe('Exact document UUID or urlId from get_document'),
      filename: z
        .string()
        .optional()
        .describe('Optional simple Markdown filename, including .md')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    const filename = ctx.input.filename ?? 'document.md';
    requireValue(
      filename.length <= 160 &&
        filename.endsWith('.md') &&
        ![...filename].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) &&
        !/[\\/:]/.test(filename),
      'Use a simple Markdown filename up to 160 characters, ending in .md, without path separators or controls.'
    );
    const bytes = await client.exportDocument(ctx.input.documentId);
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(bytes)),
      filename,
      mimeType: 'text/markdown'
    });
    return {
      output: {
        documentId: ctx.input.documentId,
        filename,
        mimeType: 'text/markdown',
        size: bytes.byteLength
      },
      message:
        'Prepared the Markdown file for download. Embedded file links retain their provider access and expiry limits.'
    };
  })
  .build();
