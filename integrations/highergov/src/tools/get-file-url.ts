import { createApiServiceError, getFileUrlTool } from 'slates';
import { Client } from '../lib/client';
import {
  assertDocumentRefreshable,
  documentReferenceSchema,
  findDocumentForRefresh,
  getDocumentRefreshAt,
  getDocumentUrl
} from '../lib/documents';
import { spec } from '../spec';

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = documentReferenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success) {
    throw createApiServiceError('The document reference is invalid. Run get_documents again.');
  }
  let reference = parsed.data;
  assertDocumentRefreshable(reference);
  let response = await new Client(ctx.auth.token).getDocuments(reference);
  let document = findDocumentForRefresh(reference, response.results);
  return { url: getDocumentUrl(document), expiresAt: getDocumentRefreshAt() };
});
