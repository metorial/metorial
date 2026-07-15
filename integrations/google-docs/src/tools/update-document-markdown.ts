import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDocsClient } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';
import { markdownInputSchema, validateMarkdown } from './markdown-input';

export let updateDocumentMarkdown = SlateTool.create(spec, {
  name: 'Update Document from Markdown',
  key: 'update_document_markdown',
  description:
    'Replaces the full body of an existing native Google Docs document by converting Markdown through a Google Drive multipart upload. The document keeps its Drive file ID and sharing settings.',
  instructions: [
    'This is a full-content replacement; use edit_document for targeted changes.',
    'Existing body content is removed when Google Drive imports the supplied Markdown.',
    'With the default drive.file consent, only documents created or opened through this connection can be updated; other documents fail with a permission error (use edit_document instead).'
  ],
  constraints: [
    'Markdown content must be non-empty and no larger than 5 MiB minus 16 KiB (5,226,496 bytes), leaving headroom for multipart upload metadata.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleDocsActionScopes.updateDocumentMarkdown)
  .input(
    z.object({
      documentId: z
        .string()
        .trim()
        .min(1)
        .describe('ID of the native Google Docs document whose body will be replaced'),
      markdown: markdownInputSchema
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier of the updated document'),
      title: z.string().describe('Title of the updated document'),
      mimeType: z.string().describe('Native Google Docs MIME type'),
      modifiedTime: z.string().optional().describe('Last modification time in ISO format'),
      webViewLink: z.string().optional().describe('URL to open the document in Google Docs')
    })
  )
  .handleInvocation(async ctx => {
    validateMarkdown(ctx.input.markdown);

    let client = new GoogleDocsClient({ token: ctx.auth.token });
    let document = await client.updateDocumentFromMarkdown(
      ctx.input.documentId,
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
      message: `Replaced document **"${document.name}"** body from Markdown while preserving ID \`${document.id}\``
    };
  })
  .build();
