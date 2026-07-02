import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Creates a new document (Doc) in Shortcut. Docs are used for long-form documentation like design documents, product strategies, and technical specs. Content can be in Markdown or HTML format.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the document (max 256 characters)'),
      content: z.string().describe('Document content in the specified format'),
      contentFormat: z
        .enum(['markdown', 'html'])
        .optional()
        .describe('Content format (default: html)')
    })
  )
  .output(
    z.object({
      documentId: z.number().describe('ID of the created document'),
      title: z.string().describe('Title of the document'),
      appUrl: z.string().describe('URL to view the document in Shortcut'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      title: ctx.input.title,
      content: ctx.input.content
    };

    if (ctx.input.contentFormat) params.content_format = ctx.input.contentFormat;

    let doc = await client.createDocument(params);

    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        appUrl: doc.app_url,
        createdAt: doc.created_at
      },
      message: `Created document **${doc.title}** (ID: ${doc.id}) — [View in Shortcut](${doc.app_url})`
    };
  })
  .build();
