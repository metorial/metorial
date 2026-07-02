import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let _papersignTriggerEvents = [
  'document.sent',
  'document.completed',
  'document.cancelled',
  'document.rejected',
  'document.expired',
  'signer.notified',
  'signer.viewed',
  'signer.consent_accepted',
  'signer.nominated',
  'signer.signed'
] as const;

export let papersignEventTrigger = SlateTrigger.create(spec, {
  name: 'Papersign Document Event',
  key: 'papersign_document_event',
  description:
    'Triggers on Papersign document signing events such as document sent, completed, cancelled, rejected, expired, and signer actions. Webhooks are configured per folder or space in Papersign.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Event type (e.g. document.sent, document.completed, signer.signed)'),
      documentId: z.string().describe('Document ID'),
      documentName: z.string().describe('Document name'),
      documentStatus: z.string().describe('Current document status'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      documentName: z.string().describe('Document name'),
      documentStatus: z.string().describe('Current document status'),
      documentUrl: z
        .string()
        .nullable()
        .describe('URL to the signed document (only available on document.completed events)'),
      signerKey: z.string().nullable().describe('Signer key (for signer-level events)'),
      signerName: z.string().nullable().describe('Signer name (for signer-level events)'),
      signerEmail: z.string().nullable().describe('Signer email (for signer-level events)'),
      folderId: z.string().nullable().describe('Folder ID'),
      folderName: z.string().nullable().describe('Folder name'),
      spaceId: z.string().nullable().describe('Space ID'),
      spaceName: z.string().nullable().describe('Space name'),
      eventType: z.string().describe('The specific event type that occurred'),
      occurredAt: z.string().nullable().describe('Timestamp when the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = String(data.event || data.type || data.trigger || 'unknown');
      let document = (data.document || data) as Record<string, unknown>;
      let documentId = String(document.id || data.document_id || '');
      let documentName = String(document.name || data.document_name || '');
      let documentStatus = String(document.status || data.status || '');

      return {
        inputs: [
          {
            eventType,
            documentId,
            documentName,
            documentStatus,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let document = (payload.document || payload) as Record<string, unknown>;
      let signer = (payload.signer || null) as Record<string, unknown> | null;
      let folder = (document.folder || payload.folder || null) as Record<
        string,
        unknown
      > | null;
      let space = (document.space || payload.space || null) as Record<string, unknown> | null;

      let documentUrl: string | null = null;
      if (ctx.input.eventType === 'document.completed') {
        documentUrl = document.document_url
          ? String(document.document_url)
          : payload.document_url
            ? String(payload.document_url)
            : null;
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.documentId}-${ctx.input.eventType}-${payload.timestamp || Date.now()}`,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          documentStatus: ctx.input.documentStatus,
          documentUrl,
          signerKey: signer ? String(signer.key || '') : null,
          signerName: signer ? String(signer.name || '') : null,
          signerEmail: signer ? String(signer.email || '') : null,
          folderId: folder ? String(folder.id || '') : null,
          folderName: folder ? String(folder.name || '') : null,
          spaceId: space ? String(space.id || '') : null,
          spaceName: space ? String(space.name || '') : null,
          eventType: ctx.input.eventType,
          occurredAt: payload.timestamp
            ? String(payload.timestamp)
            : payload.created_at
              ? String(payload.created_at)
              : null
        }
      };
    }
  })
  .build();
