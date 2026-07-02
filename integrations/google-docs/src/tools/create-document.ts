import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDocsClient } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Creates a new empty Google Docs document with the specified title. Returns the document ID which can be used to add content using other tools.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleDocsActionScopes.createDocument)
  .input(
    z.object({
      title: z.string().describe('Title for the new document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier of the created document'),
      title: z.string().describe('Title of the created document'),
      revisionId: z.string().optional().describe('Current revision ID of the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDocsClient({
      token: ctx.auth.token
    });

    let document = await client.createDocument(ctx.input.title);

    return {
      output: {
        documentId: document.documentId,
        title: document.title,
        revisionId: document.revisionId
      },
      message: `Created document **"${document.title}"** with ID \`${document.documentId}\``
    };
  })
  .build();
