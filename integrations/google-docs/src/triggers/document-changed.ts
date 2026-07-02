import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GoogleDocsClient } from '../lib/client';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';

export let documentChanged = SlateTrigger.create(spec, {
  name: 'Document Changed',
  key: 'document_changed',
  description:
    'Triggers when a Google Docs document is created, modified, or deleted. Uses the Google Drive API to monitor changes to documents.'
})
  .scopes(googleDocsActionScopes.documentChanged)
  .input(
    z.object({
      changeType: z.enum(['file', 'user']).describe('Type of change detected'),
      changeTime: z.string().describe('Time when the change occurred'),
      documentId: z.string().optional().describe('ID of the changed document'),
      documentName: z.string().optional().describe('Name of the changed document'),
      removed: z.boolean().describe('Whether the document was removed/deleted'),
      modifiedTime: z.string().optional().describe('Last modification time of the document'),
      webViewLink: z.string().optional().describe('URL to view the document'),
      lastModifiedBy: z
        .object({
          name: z.string().optional(),
          email: z.string().optional()
        })
        .optional()
        .describe('User who made the change')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the changed document'),
      documentName: z.string().describe('Name of the changed document'),
      changeType: z.enum(['created', 'modified', 'deleted']).describe('Type of change'),
      modifiedTime: z.string().optional().describe('Last modification time'),
      webViewLink: z.string().optional().describe('URL to view the document'),
      lastModifiedBy: z
        .object({
          name: z.string().optional(),
          email: z.string().optional()
        })
        .optional()
        .describe('User who made the change')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new GoogleDocsClient({
        token: ctx.auth.token
      });

      // Get the page token from state or initialize it
      let pageToken = ctx.state?.pageToken as string | undefined;
      let knownDocuments = (ctx.state?.knownDocuments || {}) as Record<string, string>; // documentId -> modifiedTime

      if (!pageToken) {
        // First run - get the start page token and do initial sync
        pageToken = await client.getStartPageToken();

        // Get initial list of documents to establish baseline
        let result = await client.listDriveFiles({
          query: "mimeType='application/vnd.google-apps.document'",
          pageSize: 100,
          orderBy: 'modifiedTime desc'
        });

        for (let file of result.files) {
          if (file.modifiedTime) {
            knownDocuments[file.id] = file.modifiedTime;
          }
        }

        return {
          inputs: [],
          updatedState: {
            pageToken,
            knownDocuments
          }
        };
      }

      // Fetch changes since last poll
      let changes = await client.listChanges(pageToken, 100);

      // Filter for Google Docs only
      let docChanges: Array<{
        changeType: 'file' | 'user';
        changeTime: string;
        documentId?: string;
        documentName?: string;
        removed: boolean;
        modifiedTime?: string;
        webViewLink?: string;
        lastModifiedBy?: { name?: string; email?: string };
      }> = [];

      for (let change of changes.changes) {
        if (change.changeType === 'file') {
          // Check if it's a Google Doc
          if (change.file?.mimeType === 'application/vnd.google-apps.document') {
            let _isNew = change.file && !knownDocuments[change.file.id];

            docChanges.push({
              changeType: 'file',
              changeTime: change.time,
              documentId: change.fileId || change.file?.id,
              documentName: change.file?.name,
              removed: change.removed,
              modifiedTime: change.file?.modifiedTime,
              webViewLink: change.file?.webViewLink,
              lastModifiedBy: change.file?.lastModifyingUser
                ? {
                    name: change.file.lastModifyingUser.displayName,
                    email: change.file.lastModifyingUser.emailAddress
                  }
                : undefined
            });

            // Update known documents
            if (change.file?.modifiedTime) {
              knownDocuments[change.file.id] = change.file.modifiedTime;
            }

            // Remove from known documents if deleted
            if (change.removed && change.fileId) {
              delete knownDocuments[change.fileId];
            }
          } else if (change.removed && change.fileId && knownDocuments[change.fileId]) {
            // Document was deleted (we knew about it before)
            docChanges.push({
              changeType: 'file',
              changeTime: change.time,
              documentId: change.fileId,
              removed: true
            });
            delete knownDocuments[change.fileId];
          }
        }
      }

      return {
        inputs: docChanges,
        updatedState: {
          pageToken: changes.newStartPageToken || pageToken,
          knownDocuments
        }
      };
    },

    handleEvent: async ctx => {
      let eventType: 'created' | 'modified' | 'deleted';

      if (ctx.input.removed) {
        eventType = 'deleted';
      } else {
        // Try to determine if this is a new document or a modification
        // This is a simplification - in practice you'd need to track document creation times
        eventType = 'modified';
      }

      return {
        type: `document.${eventType}`,
        id: `${ctx.input.documentId || 'unknown'}_${ctx.input.changeTime}`,
        output: {
          documentId: ctx.input.documentId || 'unknown',
          documentName: ctx.input.documentName || 'Unknown Document',
          changeType: eventType,
          modifiedTime: ctx.input.modifiedTime,
          webViewLink: ctx.input.webViewLink,
          lastModifiedBy: ctx.input.lastModifiedBy
        }
      };
    }
  })
  .build();
