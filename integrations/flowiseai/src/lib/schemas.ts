import { z } from 'zod';

export const paginationShape = {
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Page number, starting at 1. Omit pagination to retrieve all results.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe('Results per page. Defaults to 100 when page is supplied.')
};

export const paginationOutputShape = {
  total: z
    .number()
    .optional()
    .describe('Total matching records when the server returns pagination metadata'),
  page: z.number().optional().describe('Requested page number'),
  limit: z.number().optional().describe('Requested results per page'),
  hasMore: z
    .boolean()
    .describe('Whether another page is available according to the server total')
};

export const documentStoreComponentSchema = z.object({
  name: z.string().min(1).describe('Flowise component name in camelCase'),
  config: z
    .record(z.string(), z.unknown())
    .describe('Provider component configuration, including any required credential IDs')
});

export const documentStoreUpsertShape = {
  docId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Existing document loader ID from get_document_store. Reuses its saved configuration.'
    ),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Metadata applied to the ingested documents'),
  replaceExisting: z
    .boolean()
    .optional()
    .describe(
      'Replace the document loader and chunks. Existing vector embeddings are not deleted.'
    ),
  loader: documentStoreComponentSchema
    .optional()
    .describe('Document loader and its source configuration'),
  splitter: documentStoreComponentSchema.optional().describe('Text splitter configuration'),
  embedding: documentStoreComponentSchema.optional().describe('Embedding model configuration'),
  vectorStore: documentStoreComponentSchema.optional().describe('Vector store configuration'),
  recordManager: documentStoreComponentSchema
    .optional()
    .describe('Optional record manager configuration')
};

export const vectorUpsertOutputShape = {
  numAdded: z.number().optional(),
  numDeleted: z.number().optional(),
  numUpdated: z.number().optional(),
  numSkipped: z.number().optional(),
  addedDocs: z.array(z.unknown()).optional()
};
