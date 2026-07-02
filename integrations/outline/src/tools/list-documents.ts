import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List documents in the workspace, optionally filtered by collection or parent document.
Can also list draft documents separately.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z
        .string()
        .optional()
        .describe('Filter to documents in a specific collection'),
      parentDocumentId: z
        .string()
        .optional()
        .describe('Filter to child documents of a specific parent'),
      drafts: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, lists draft documents instead of published ones'),
      sort: z
        .enum(['title', 'updatedAt', 'createdAt'])
        .optional()
        .default('updatedAt')
        .describe('Field to sort by'),
      direction: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort direction'),
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of documents to return'),
      offset: z.number().optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      documents: z.array(
        z.object({
          documentId: z.string(),
          title: z.string(),
          emoji: z.string().optional(),
          collectionId: z.string().optional(),
          parentDocumentId: z.string().optional(),
          publishedAt: z.string().optional(),
          updatedAt: z.string(),
          createdAt: z.string(),
          template: z.boolean(),
          createdBy: z.object({ userId: z.string(), name: z.string() })
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = ctx.input.drafts
      ? await client.listDrafts({
          collectionId: ctx.input.collectionId,
          sort: ctx.input.sort,
          direction: ctx.input.direction,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        })
      : await client.listDocuments({
          collectionId: ctx.input.collectionId,
          parentDocumentId: ctx.input.parentDocumentId,
          sort: ctx.input.sort,
          direction: ctx.input.direction,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });

    let documents = (result.data || []).map(doc => ({
      documentId: doc.id,
      title: doc.title,
      emoji: doc.emoji,
      collectionId: doc.collectionId,
      parentDocumentId: doc.parentDocumentId,
      publishedAt: doc.publishedAt,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      template: doc.template,
      createdBy: { userId: doc.createdBy.id, name: doc.createdBy.name }
    }));

    return {
      output: {
        documents,
        total: documents.length
      },
      message: `Found **${documents.length}** ${ctx.input.drafts ? 'draft ' : ''}documents.`
    };
  })
  .build();
