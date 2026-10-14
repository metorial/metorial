import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocumentChunks = SlateTool.create(spec, {
  name: 'List Document Chunks',
  key: 'list_document_chunks',
  description:
    'Read a page of document chunks in index order, optionally limited to a range of chunk indices. Use the returned cursor to continue reading a large document.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID from list_documents or create_document'),
      cursor: z.string().optional().describe('Cursor from the previous chunk page'),
      pageSize: z
        .number()
        .optional()
        .describe('Chunks per page, a whole number from 1 to 100'),
      startIndex: z
        .number()
        .optional()
        .describe('First chunk index to include, a nonnegative whole number'),
      endIndex: z
        .number()
        .optional()
        .describe('Last chunk index to include, a nonnegative whole number'),
      partition: z.string().optional().describe('Partition override')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      chunks: z.array(
        z.object({
          chunkId: z.string(),
          chunkIndex: z
            .number()
            .describe('Chunk index; -1 indicates a legacy chunk without an index'),
          text: z.string(),
          metadata: z.record(z.string(), z.any()),
          links: z.record(z.string(), z.any())
        })
      ),
      nextCursor: z.string().nullable(),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    for (let [name, value] of [
      ['startIndex', ctx.input.startIndex],
      ['endIndex', ctx.input.endIndex]
    ] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw createApiServiceError(`${name} must be a nonnegative whole number.`);
      }
    }
    if (
      ctx.input.startIndex !== undefined &&
      ctx.input.endIndex !== undefined &&
      ctx.input.endIndex < ctx.input.startIndex
    ) {
      throw createApiServiceError('endIndex must be greater than or equal to startIndex.');
    }
    let client = new Client({ token: ctx.auth.token, partition: ctx.config.partition });
    let result = await client.getDocumentChunks(ctx.input.documentId, ctx.input);
    return {
      output: {
        documentId: ctx.input.documentId,
        chunks: result.chunks.map(chunk => ({
          chunkId: chunk.id,
          chunkIndex: chunk.index ?? -1,
          text: chunk.text,
          metadata: chunk.metadata ?? {},
          links: chunk.links ?? {}
        })),
        nextCursor: result.pagination.nextCursor,
        totalCount: result.pagination.totalCount
      },
      message: `Returned **${result.chunks.length}** chunks.${result.pagination.nextCursor ? ' More pages available.' : ''}`
    };
  })
  .build();
