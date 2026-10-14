import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let documentIdInputs = {
  documentId: z
    .number()
    .optional()
    .describe(
      'Legacy numeric ID. Use documentUuid from list_documents for current documents.'
    ),
  documentUuid: z
    .string()
    .uuid()
    .optional()
    .describe('Document UUID. Call list_documents to discover accessible document UUIDs.')
};

export let resolveDocumentId = (input: { documentId?: number; documentUuid?: string }) => {
  if (input.documentId !== undefined && input.documentUuid !== undefined) {
    throw createApiServiceError('Provide only documentUuid or the legacy documentId.');
  }
  let id = input.documentUuid ?? input.documentId;
  if (id === undefined) {
    throw createApiServiceError(
      'documentUuid is required. Call list_documents to discover accessible document UUIDs.'
    );
  }
  return id;
};
