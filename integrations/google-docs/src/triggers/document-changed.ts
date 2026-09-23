import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { googleDocsActionScopes } from '../scopes';
import { spec } from '../spec';
import { documentChangeSchema, documentChanges } from './document-changes-group';

export const documentChanged = SlateTrigger.create(spec, {
  name: 'Document Changed',
  key: 'document_changed',
  description: 'Detects recent Google Docs document changes visible through Google Drive.'
})
  .scopes(googleDocsActionScopes.documentChanged)
  .triggerGroup(documentChanges)
  .input(documentChangeSchema)
  .output(
    z.object({
      documentId: z.string().describe('ID of the changed document'),
      documentName: z.string().describe('Name of the changed document'),
      changeType: z.enum(['created', 'modified']).describe('Type of change'),
      modifiedTime: z.string().describe('Last modification time'),
      webViewLink: z.string().optional().describe('URL to view the document'),
      lastModifiedBy: z
        .object({ name: z.string().optional(), email: z.string().optional() })
        .optional()
        .describe('User who made the change')
    })
  )
  .matches(payload => {
    const parsed = documentChangeSchema.safeParse(payload);
    return parsed.success && !!parsed.data.documentId;
  })
  .map(async ctx => {
    const eventType =
      ctx.input.createdTime === ctx.input.modifiedTime ? 'created' : 'modified';
    return {
      type: `document.${eventType}`,
      id: `${ctx.input.documentId}_${ctx.input.modifiedTime}`,
      output: {
        documentId: ctx.input.documentId,
        documentName: ctx.input.documentName || 'Unknown Document',
        changeType: eventType,
        modifiedTime: ctx.input.modifiedTime,
        webViewLink: ctx.input.webViewLink,
        lastModifiedBy: ctx.input.lastModifiedBy
      }
    };
  })
  .build();
