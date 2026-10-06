import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export const deleteDocumentStoreVectors = SlateTool.create(spec, {
  name: 'Delete Document Store Vectors',
  key: 'delete_document_store_vectors',
  description:
    'Delete vector data indexed through a document store record manager. The store must have embedding, vector-store, and record-manager configuration. This deletes indexed data while preserving the document store. Call list_document_stores to discover store IDs.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      storeId: z.string().min(1).describe('Document store ID from list_document_stores')
    })
  )
  .output(z.object({ success: z.boolean(), storeId: z.string() }))
  .handleInvocation(async ctx => {
    const client = new FlowiseClient({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    await client.deleteDocumentStoreVectorStore(ctx.input.storeId);
    return {
      output: { success: true, storeId: ctx.input.storeId },
      message: `Deleted record-manager-tracked vectors for store ${ctx.input.storeId}.`
    };
  })
  .build();
