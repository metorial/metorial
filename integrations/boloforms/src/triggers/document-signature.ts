import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let documentSignatureTrigger = SlateTrigger.create(spec, {
  name: 'Document Signature Events',
  key: 'document_signature_events',
  description:
    'Triggers when signature-related events occur on PDF documents, including when a document is fully signed, when an individual signer views the document, or when an individual signer completes their signature.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event type'),
      documentId: z.string().optional().describe('ID of the document'),
      documentName: z.string().optional().describe('Name of the document'),
      documentUrl: z.string().optional().describe('URL of the document'),
      finishedPdfUrl: z.string().optional().describe('URL to the completed signed PDF'),
      signers: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of signers and their statuses'),
      signer: z
        .record(z.string(), z.any())
        .optional()
        .describe('Individual signer details for individual events'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      documentId: z.string().optional().describe('ID of the document'),
      documentName: z.string().optional().describe('Name of the document'),
      documentUrl: z.string().optional().describe('URL of the document'),
      finishedPdfUrl: z.string().optional().describe('URL to the completed signed PDF'),
      signerEmail: z
        .string()
        .optional()
        .describe('Email of the individual signer (for individual events)'),
      signerName: z
        .string()
        .optional()
        .describe('Name of the individual signer (for individual events)'),
      signerStatus: z.string().optional().describe('Status of the individual signer'),
      signers: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('All signers and their statuses')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let items = Array.isArray(data) ? data : [data];

      let inputs = items.map((item: any) => ({
        webhookEvent: item.webhookEvent ?? 'unknown',
        documentId: item.documentId,
        documentName: item.documentName,
        documentUrl: item.documentUrl,
        finishedPdfUrl: item.finishedPdfUrl,
        signers: item.signers,
        signer: item.signer ?? item.signerDetails,
        rawPayload: item
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.webhookEvent;
      let type = 'document.signature_event';

      if (eventType === 'new_signature_pdf_completed') {
        type = 'document.signature_completed';
      } else if (eventType === 'new_signature_pdf_individual_viewed') {
        type = 'document.individual_viewed';
      } else if (eventType === 'new_signature_pdf_individual_signed') {
        type = 'document.individual_signed';
      }

      let signer = ctx.input.signer;

      return {
        type,
        id: `${ctx.input.documentId ?? 'unknown'}-${eventType}-${Date.now()}`,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          documentUrl: ctx.input.documentUrl,
          finishedPdfUrl: ctx.input.finishedPdfUrl,
          signerEmail: signer?.email,
          signerName: signer?.name,
          signerStatus: signer?.status,
          signers: ctx.input.signers
        }
      };
    }
  })
  .build();
