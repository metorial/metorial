import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { documentStoreUpsertShape, vectorUpsertOutputShape } from '../lib/schemas';
import { spec } from '../spec';

export const upsertDocumentStore = SlateTool.create(spec, {
  name: 'Upsert Document Store',
  key: 'upsert_document_store',
  description:
    'Load, split, and index documents in an existing document store. Supply a loader with its source configuration or reuse an existing docId from get_document_store. New stores also need embedding and vectorStore configuration. Call list_document_stores to discover store IDs.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      storeId: z.string().min(1).describe('Document store ID from list_document_stores'),
      ...documentStoreUpsertShape
    })
  )
  .output(
    z.object({
      storeId: z.string(),
      docId: z
        .string()
        .optional()
        .describe('Ingested document loader ID for chunk retrieval or later updates'),
      ...vectorUpsertOutputShape
    })
  )
  .handleInvocation(async ctx => {
    const { storeId, ...body } = ctx.input;
    if (!body.docId && !body.loader) {
      throw createApiServiceError(
        'Provide loader configuration or an existing docId to ingest documents.'
      );
    }
    const client = new FlowiseClient({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    const result = await client.upsertDocumentStore(storeId, body);
    return {
      output: {
        storeId,
        docId: result.docId,
        numAdded: result.numAdded,
        numDeleted: result.numDeleted,
        numUpdated: result.numUpdated,
        numSkipped: result.numSkipped,
        addedDocs: result.addedDocs
      },
      message: `Indexed documents in store ${storeId}.`
    };
  })
  .build();
