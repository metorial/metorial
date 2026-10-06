import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export const updateDocumentStore = SlateTool.create(spec, {
  name: 'Update Document Store',
  key: 'update_document_store',
  description:
    'Update a document store name or description. Call list_document_stores to discover store IDs.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      storeId: z.string().min(1).describe('Document store ID from list_document_stores'),
      name: z.string().min(1).optional().describe('Updated document store name'),
      description: z
        .string()
        .optional()
        .describe('Updated description; an empty string clears it')
    })
  )
  .output(
    z.object({
      storeId: z.string(),
      name: z.string(),
      description: z.string().nullish(),
      status: z.string().optional(),
      updatedDate: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const { storeId, ...updates } = ctx.input;
    if (updates.name === undefined && updates.description === undefined) {
      throw createApiServiceError('Provide name or description to update the document store.');
    }
    const client = new FlowiseClient({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    const result = await client.updateDocumentStore(storeId, updates);
    return {
      output: {
        storeId: result.id,
        name: result.name,
        description: result.description,
        status: result.status,
        updatedDate: result.updatedDate
      },
      message: `Updated document store ${result.name}.`
    };
  })
  .build();
