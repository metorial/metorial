import { buildApiServiceError, createApiServiceError, triggerGroup } from 'slates';
import { z } from 'zod';
import { GOOGLE_DOCS_MIME_TYPE, GoogleDocsClient } from '../lib/client';
import { spec } from '../spec';

// Production polls every 15 minutes without saved state. The overlapping window
// protects against ordinary scheduling drift; stable file/time keys deduplicate it.
export const DOCUMENT_CHANGE_WINDOW_MS = 30 * 60 * 1000;

export const documentChangeSchema = z.object({
  documentId: z.string().describe('ID of the changed document'),
  documentName: z.string().optional().describe('Name of the changed document'),
  modifiedTime: z.string().describe('Last modification time of the document'),
  createdTime: z.string().optional().describe('Time when the document was created'),
  webViewLink: z.string().optional().describe('URL to view the document'),
  lastModifiedBy: z
    .object({ name: z.string().optional(), email: z.string().optional() })
    .optional()
    .describe('User who made the change')
});

export const documentChanges = triggerGroup(spec, {
  key: 'document_changes',
  name: 'Document Changes',
  description: 'Changes to Google Docs documents visible through Google Drive.',
  eventSchema: documentChangeSchema
})
  .polling({
    intervalSeconds: 900,
    pollEvents: async ctx => {
      const client = new GoogleDocsClient({ token: ctx.auth.token });
      const events: {
        payload: z.infer<typeof documentChangeSchema>;
        idempotencyKey: string;
      }[] = [];
      const modifiedAfter = new Date(Date.now() - DOCUMENT_CHANGE_WINDOW_MS).toISOString();
      let pageToken: string | undefined;

      do {
        let page: Awaited<ReturnType<GoogleDocsClient['listDriveFiles']>>;
        try {
          page = await client.listDriveFiles({
            query: `mimeType = '${GOOGLE_DOCS_MIME_TYPE}' and modifiedTime > '${modifiedAfter}' and trashed = false`,
            pageSize: 1000,
            pageToken,
            orderBy: 'modifiedTime desc'
          });
        } catch (error) {
          throw buildApiServiceError(error, {
            providerLabel: 'Google Drive',
            operation: 'list recently changed documents',
            reason: 'google_docs_change_poll_failed'
          });
        }
        if (!page || (page.files !== undefined && !Array.isArray(page.files))) {
          throw createApiServiceError('Google Drive returned an invalid document list.', {
            reason: 'google_docs_invalid_document_list'
          });
        }
        for (const file of page.files ?? []) {
          if (!file || file.mimeType !== GOOGLE_DOCS_MIME_TYPE) {
            throw createApiServiceError('Google Drive returned invalid document metadata.', {
              reason: 'google_docs_invalid_document_metadata'
            });
          }

          const payload = documentChangeSchema.safeParse({
            documentId: file.id,
            documentName: file.name,
            modifiedTime: file.modifiedTime,
            createdTime: file.createdTime,
            webViewLink: file.webViewLink,
            lastModifiedBy: file.lastModifyingUser
              ? {
                  name: file.lastModifyingUser.displayName,
                  email: file.lastModifyingUser.emailAddress
                }
              : undefined
          });
          if (!payload.success) {
            throw createApiServiceError('Google Drive returned invalid document metadata.', {
              reason: 'google_docs_invalid_document_metadata'
            });
          }
          events.push({
            payload: payload.data,
            idempotencyKey: `${file.id}:${file.modifiedTime}`
          });
        }
        pageToken = page.nextPageToken;
      } while (pageToken);

      return { events };
    }
  })
  // Polls run for one connection; no cross-connection webhook routing is used.
  .routingMatchers(async () => [])
  .build();
