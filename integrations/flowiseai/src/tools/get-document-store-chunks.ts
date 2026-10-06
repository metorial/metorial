import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export const getDocumentStoreChunks = SlateTool.create(spec, {
  name: 'Get Document Store Chunks',
  key: 'get_document_store_chunks',
  description:
    'Read a page of ingested document chunks, their content, and pagination metadata. Discover the document loader ID with get_document_store.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      storeId: z.string().min(1).describe('Document store ID from list_document_stores'),
      loaderId: z.string().min(1).describe('Document loader ID from get_document_store'),
      page: z.number().int().min(1).default(1).describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      chunks: z
        .array(z.unknown())
        .describe('Chunks containing stable IDs, page content, and metadata'),
      count: z.number().describe('Total chunk count'),
      currentPage: z.number(),
      file: z.unknown().optional().describe('Document loader information'),
      storeName: z.string().optional(),
      description: z.string().nullish()
    })
  )
  .handleInvocation(async ctx => {
    const client = new FlowiseClient({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    const result = await client.getDocumentStoreChunks(
      ctx.input.storeId,
      ctx.input.loaderId,
      ctx.input.page
    );
    return {
      output: {
        chunks: result.chunks,
        count: result.count,
        currentPage: result.currentPage,
        file: result.file,
        storeName: result.storeName,
        description: result.description
      },
      message: `Retrieved document chunks on page ${ctx.input.page}.`
    };
  })
  .build();
