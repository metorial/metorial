import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let signerInfoSchema = z.object({
  signerName: z.string().optional().describe('Signer name'),
  signerEmail: z.string().optional().describe('Signer email'),
  signerRole: z.string().optional().describe('Signer role'),
  signerOrder: z.number().optional().describe('Signer order')
});

export let documentEvent = SlateTrigger.create(spec, {
  name: 'Document Event',
  key: 'document_event',
  description:
    'Triggered on document lifecycle events including created, sent, viewed, signed, completed, declined, forwarded, expired, revoked, and cancelled. Also covers signer events such as signer_removed, signer_bounced, and email_validation_waived.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the event'),
      eventHash: z.string().describe('Unique event identifier'),
      documentHash: z.string().describe('Hash of the affected document'),
      timestamp: z.string().describe('Event timestamp'),
      signer: signerInfoSchema.optional().describe('Signer information if applicable'),
      meta: z.record(z.string(), z.any()).optional().describe('Additional event metadata')
    })
  )
  .output(
    z.object({
      documentHash: z.string().describe('Hash of the affected document'),
      eventTimestamp: z.string().describe('When the event occurred'),
      signerName: z.string().optional().describe('Name of the signer involved'),
      signerEmail: z.string().optional().describe('Email of the signer involved'),
      signerRole: z.string().optional().describe('Role of the signer involved'),
      signerOrder: z.number().optional().describe('Signing order of the signer involved'),
      businessId: z.string().optional().describe('Business ID associated with the event'),
      userId: z.string().optional().describe('User ID who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.input.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.event_type) {
        return { inputs: [] };
      }

      let eventHash = data.event_hash || `${data.event_type}_${data.event_time || Date.now()}`;

      let signer: Record<string, any> | undefined;
      if (data.signer) {
        signer = {
          signerName: data.signer.signer_name || undefined,
          signerEmail: data.signer.signer_email || undefined,
          signerRole: data.signer.signer_role || undefined,
          signerOrder: data.signer.signer_order ?? undefined
        };
      }

      return {
        inputs: [
          {
            eventType: data.event_type,
            eventHash: String(eventHash),
            documentHash: data.meta?.related_document_hash || data.document_hash || '',
            timestamp: data.event_time ? String(data.event_time) : String(Date.now()),
            signer,
            meta: {
              businessId: data.meta?.business_id || undefined,
              userId: data.meta?.user_id || undefined,
              appId: data.meta?.app_id || undefined
            }
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `document.${ctx.input.eventType}`,
        id: ctx.input.eventHash,
        output: {
          documentHash: ctx.input.documentHash,
          eventTimestamp: ctx.input.timestamp,
          signerName: ctx.input.signer?.signerName,
          signerEmail: ctx.input.signer?.signerEmail,
          signerRole: ctx.input.signer?.signerRole,
          signerOrder: ctx.input.signer?.signerOrder,
          businessId: ctx.input.meta?.businessId
            ? String(ctx.input.meta.businessId)
            : undefined,
          userId: ctx.input.meta?.userId ? String(ctx.input.meta.userId) : undefined
        }
      };
    }
  })
  .build();
