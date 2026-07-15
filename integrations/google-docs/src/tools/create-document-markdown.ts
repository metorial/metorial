import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDocsClient } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';
import { markdownInputSchema, validateMarkdown } from './markdown-input';

export let createDocumentMarkdown = SlateTool.create(spec, {
  name: 'Create Document from Markdown',
  key: 'create_document_markdown',
  description:
    'Creates a native Google Docs document by converting Markdown through a Google Drive multipart upload. Google Drive determines which Markdown structure and formatting it can preserve during import.',
  instructions: [
    'Use create_document when an empty document is sufficient.',
    'The result is a native Google Docs document, not a Markdown file stored in Drive.'
  ],
  constraints: [
    'Markdown content must be non-empty and no larger than 5 MiB minus 16 KiB (5,226,496 bytes), leaving headroom for multipart upload metadata.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleDocsActionScopes.createDocumentMarkdown)
  .input(
    z.object({
      title: z.string().trim().min(1).describe('Title for the new Google Docs document'),
      markdown: markdownInputSchema
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier of the created document'),
      title: z.string().describe('Title of the created document'),
      mimeType: z.string().describe('Native Google Docs MIME type'),
      modifiedTime: z.string().optional().describe('Last modification time in ISO format'),
      webViewLink: z.string().optional().describe('URL to open the document in Google Docs')
    })
  )
  .handleInvocation(async ctx => {
    validateMarkdown(ctx.input.markdown);

    let client = new GoogleDocsClient({ token: ctx.auth.token });
    let document = await client.createDocumentFromMarkdown(
      ctx.input.title,
      ctx.input.markdown
    );

    return {
      output: {
        documentId: document.id,
        title: document.name,
        mimeType: document.mimeType,
        modifiedTime: document.modifiedTime,
        webViewLink: document.webViewLink
      },
      message: `Created native Google Docs document **"${document.name}"** from Markdown with ID \`${document.id}\``
    };
  })
  .build();
