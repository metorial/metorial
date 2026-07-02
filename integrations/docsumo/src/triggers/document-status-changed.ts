import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let documentStatusChanged = SlateTrigger.create(spec, {
  name: 'Document Status Changed',
  key: 'document_status_changed',
  description:
    "Triggers when a document's processing status changes in Docsumo, such as when processing completes, a document is approved, or its review status is updated.",
  instructions: [
    'Configure the webhook URL in your Docsumo account under Settings > Integrations. Enable the "Document Status Change" event.',
    'The webhook URL is different for test and production mode in Docsumo.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('Type of status change event'),
      docId: z.string().describe('Document ID'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw webhook payload from Docsumo')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('Unique document identifier'),
      title: z.string().optional().describe('Document filename'),
      status: z.string().optional().describe('Current processing status of the document'),
      type: z.string().optional().describe('Document type identifier'),
      reviewUrl: z.string().optional().describe('URL to review the document'),
      userDocId: z.string().optional().describe('User-defined document ID'),
      userId: z.string().optional().describe('User ID of the document owner'),
      email: z.string().optional().describe('Email of the document owner'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) {
        return { inputs: [] };
      }

      // Handle both single document and array payloads
      let documents =
        body.data?.document || body.data?.documents || body.document || body.documents;
      if (!documents) {
        // The payload itself might be the document data
        let docId = body.doc_id || body.data?.doc_id;
        if (docId) {
          return {
            inputs: [
              {
                eventType: body.event_type || body.event || body.status || 'status_changed',
                docId,
                rawPayload: body
              }
            ]
          };
        }
        return { inputs: [] };
      }

      let docList = Array.isArray(documents) ? documents : [documents];

      let inputs = docList
        .map((doc: any) => ({
          eventType: body.event_type || body.event || doc.status || 'status_changed',
          docId: doc.doc_id || '',
          rawPayload: body
        }))
        .filter((input: any) => input.docId);

      return { inputs };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload as any;
      let payloadData = payload.data || {};
      let doc =
        payloadData.document?.[0] ||
        payloadData.document ||
        payload.document ||
        payloadData ||
        payload;

      return {
        type: `document.${ctx.input.eventType}`,
        id: `${ctx.input.docId}_${ctx.input.eventType}_${payload.timestamp || payload.created_at || Date.now()}`,
        output: {
          docId: ctx.input.docId,
          title: doc.title,
          status: doc.status,
          type: doc.type,
          reviewUrl: doc.review_url,
          userDocId: doc.user_doc_id,
          userId: doc.user_id,
          email: doc.email,
          createdAt: doc.created_at || doc.created_at_iso
        }
      };
    }
  })
  .build();
