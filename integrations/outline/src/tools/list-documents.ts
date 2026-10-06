import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, clientConfig } from '../lib/client';
import { documentOutput, mapDocument, paginationSchema } from '../lib/schemas';
import { requireValue } from '../lib/validation';
import { spec } from '../spec';
export const listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description:
    'List one page of documents or your drafts. Native pagination is returned; total counts this page only.',
  tags: { readOnly: true }
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
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('Maximum number of documents to return'),
      offset: z.number().int().min(0).optional().default(0).describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      documents: z.array(documentOutput),
      total: z.number(),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(clientConfig(ctx.auth, ctx.config));
    requireValue(
      !ctx.input.drafts || !ctx.input.parentDocumentId,
      'parentDocumentId is not supported by the drafts endpoint. Remove it or list published documents.'
    );
    const { drafts, ...input } = ctx.input;
    const result = drafts ? await client.listDrafts(input) : await client.listDocuments(input);
    const documents = result.data.map(mapDocument);
    return {
      output: { documents, total: documents.length, pagination: result.pagination },
      message: `Returned ${documents.length} ${drafts ? 'draft ' : ''}documents on this page.`
    };
  })
  .build();
