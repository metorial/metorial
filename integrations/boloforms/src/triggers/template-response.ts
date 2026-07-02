import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let templateResponseTrigger = SlateTrigger.create(spec, {
  name: 'Template Response Events',
  key: 'template_response_events',
  description:
    'Triggers when events occur on template-based documents, including when all responses are completed, when an individual signer views the template, or when an individual signer completes their signature.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event type'),
      documentId: z.string().optional().describe('ID of the template document'),
      documentName: z.string().optional().describe('Name of the template document'),
      finishedPdfUrl: z.string().optional().describe('URL to the completed signed PDF'),
      signers: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of signers with role titles and statuses'),
      signer: z.record(z.string(), z.any()).optional().describe('Individual signer details'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      documentId: z.string().optional().describe('ID of the template document'),
      documentName: z.string().optional().describe('Name of the template document'),
      finishedPdfUrl: z.string().optional().describe('URL to the completed signed PDF'),
      signerEmail: z.string().optional().describe('Email of the individual signer'),
      signerName: z.string().optional().describe('Name of the individual signer'),
      signerRoleTitle: z.string().optional().describe('Role title of the individual signer'),
      signerStatus: z.string().optional().describe('Status of the individual signer'),
      signers: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('All signers with role titles and statuses')
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
        finishedPdfUrl: item.finishedPdfUrl,
        signers: item.signers,
        signer: item.signer ?? item.signerDetails,
        rawPayload: item
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.webhookEvent;
      let type = 'template.response_event';

      if (eventType === 'new_template_response') {
        type = 'template.response_completed';
      } else if (eventType === 'new_template_response_individual_viewed') {
        type = 'template.individual_viewed';
      } else if (eventType === 'new_template_response_individual_signed') {
        type = 'template.individual_signed';
      }

      let signer = ctx.input.signer;

      return {
        type,
        id: `${ctx.input.documentId ?? 'unknown'}-${eventType}-${Date.now()}`,
        output: {
          documentId: ctx.input.documentId,
          documentName: ctx.input.documentName,
          finishedPdfUrl: ctx.input.finishedPdfUrl,
          signerEmail: signer?.email,
          signerName: signer?.name,
          signerRoleTitle: signer?.roleTitle,
          signerStatus: signer?.status,
          signers: ctx.input.signers
        }
      };
    }
  })
  .build();
