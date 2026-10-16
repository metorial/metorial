import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';

export let getDocumentRelatedKey = (relatedKey: string) => {
  if (!relatedKey.trim()) {
    throw createApiServiceError(
      'relatedKey must not be blank. Use document_path from search_opportunities.'
    );
  }
  if (!relatedKey.startsWith('/') && !/^https?:\/\//i.test(relatedKey)) return relatedKey;
  let parsed: URL;
  try {
    parsed = new URL(relatedKey, 'https://www.highergov.com');
  } catch (error) {
    throw createApiServiceError(
      'The document_path is invalid. Use the value from search_opportunities.',
      { parent: error }
    );
  }
  let key = parsed.searchParams.get('related_key');
  if (
    parsed.origin !== 'https://www.highergov.com' ||
    parsed.pathname !== '/api-external/document/' ||
    !key?.trim()
  ) {
    throw createApiServiceError(
      'Use a HigherGov document_path containing related_key, or provide the related key directly.'
    );
  }
  return key;
};

export let documentReferenceSchema = z.object({
  relatedKey: z.string(),
  ordering: z.string().optional(),
  pageNumber: z.number().optional(),
  pageSize: z.number().optional(),
  fileName: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  postedDate: z.string().nullable().optional(),
  originalPageUnique: z.boolean().optional()
});

export let getDocumentReference = (
  request: { relatedKey: string; ordering?: string; pageNumber?: number; pageSize?: number },
  document: Record<string, unknown>,
  originalPage?: readonly Record<string, unknown>[]
) => {
  let parsed = documentReferenceSchema.safeParse({
    relatedKey: getDocumentRelatedKey(request.relatedKey),
    ordering: request.ordering,
    pageNumber: request.pageNumber,
    pageSize: request.pageSize,
    ...pickDefined({
      fileName: document.file_name,
      fileSize: document.file_size,
      postedDate: document.posted_date
    })
  });
  if (!parsed.success) {
    throw createApiServiceError(
      'HigherGov returned invalid document metadata. Request the documents again.'
    );
  }
  return {
    ...parsed.data,
    originalPageUnique:
      originalPage !== undefined &&
      hasIdentifyingMetadata(parsed.data) &&
      originalPage.filter(candidate => hasMatchingMetadata(parsed.data, candidate)).length ===
        1
  };
};

type DocumentReference = z.infer<typeof documentReferenceSchema>;

let hasIdentifyingMetadata = (reference: DocumentReference) =>
  typeof reference.fileName === 'string' &&
  reference.fileName.trim().length > 0 &&
  ((typeof reference.fileSize === 'number' && reference.fileSize >= 0) ||
    (typeof reference.postedDate === 'string' && reference.postedDate.trim().length > 0));

let hasMatchingMetadata = (reference: DocumentReference, document: Record<string, unknown>) =>
  document.file_name === reference.fileName &&
  document.file_size === reference.fileSize &&
  document.posted_date === reference.postedDate;

export let assertDocumentRefreshable = (reference: DocumentReference) => {
  if (!hasIdentifyingMetadata(reference) || reference.originalPageUnique !== true) {
    throw createApiServiceError(
      'The original document did not have unique identifying metadata. Run get_documents again.'
    );
  }
};

export let findDocumentForRefresh = (
  reference: DocumentReference,
  documents: readonly Record<string, unknown>[]
) => {
  assertDocumentRefreshable(reference);
  let matches = documents.filter(document => hasMatchingMetadata(reference, document));
  if (matches.length !== 1) {
    throw createApiServiceError(
      'The document could not be identified uniquely on its original result page. Run get_documents again.'
    );
  }
  return matches[0]!;
};

export let getDocumentUrl = (document: Record<string, unknown>) => {
  if (typeof document.download_url !== 'string' || !document.download_url.trim()) {
    throw createApiServiceError(
      'HigherGov did not return a document download URL. Request the documents again.'
    );
  }
  try {
    let url = new URL(document.download_url, 'https://www.highergov.com');
    if (!['https:', 'http:'].includes(url.protocol))
      throw createApiServiceError('HigherGov returned an unsupported document download URL.');
    return url.toString();
  } catch (error) {
    throw createApiServiceError('HigherGov returned an invalid document download URL.', {
      parent: error
    });
  }
};

// The provider documents a 60-minute URL lifetime; renew five minutes early.
export let getDocumentRefreshAt = () => new Date(Date.now() + 55 * 60_000).toISOString();
