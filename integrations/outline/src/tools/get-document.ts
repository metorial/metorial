import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a single document by its ID, including its full markdown content, metadata, and author information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      title: z.string(),
      text: z.string().describe('Full markdown content of the document'),
      emoji: z.string().optional(),
      collectionId: z.string().optional(),
      parentDocumentId: z.string().optional(),
      template: z.boolean(),
      publishedAt: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      archivedAt: z.string().optional(),
      revision: z.number(),
      fullWidth: z.boolean(),
      createdBy: z.object({ userId: z.string(), name: z.string() }),
      updatedBy: z.object({ userId: z.string(), name: z.string() })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let doc = await client.getDocument(ctx.input.documentId);

    return {
      output: {
        documentId: doc.id,
        title: doc.title,
        text: doc.text,
        emoji: doc.emoji,
        collectionId: doc.collectionId,
        parentDocumentId: doc.parentDocumentId,
        template: doc.template,
        publishedAt: doc.publishedAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        archivedAt: doc.archivedAt,
        revision: doc.revision,
        fullWidth: doc.fullWidth,
        createdBy: { userId: doc.createdBy.id, name: doc.createdBy.name },
        updatedBy: { userId: doc.updatedBy.id, name: doc.updatedBy.name }
      },
      message: `Retrieved document **"${doc.title}"** (revision ${doc.revision}).`
    };
  })
  .build();
