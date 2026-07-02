import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let documentGenerated = SlateTrigger.create(spec, {
  name: 'Document Generated',
  key: 'document_generated',
  description:
    "Triggers when a document generation completes. Configure the webhook URL in the automation's output settings in DocsAutomator. This fires for non-eSign document generation completions."
})
  .input(
    z.object({
      rawPayload: z
        .record(z.string(), z.unknown())
        .describe('Full raw webhook payload from DocsAutomator.')
    })
  )
  .output(
    z.object({
      pdfUrl: z.string().optional().describe('URL to download the generated PDF.'),
      googleDocUrl: z
        .string()
        .optional()
        .describe('URL of the generated Google Doc (if enabled).'),
      documentName: z.string().optional().describe('Name of the generated document.'),
      automationId: z
        .string()
        .optional()
        .describe('The automation ID that generated this document.'),
      additionalParams: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom webhook parameters passed in the original API request.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      // If this is an e-sign event, return empty so it doesn't match this trigger
      if (data.event && (data.event as string).startsWith('esign.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload as Record<string, any>;

      let documentId =
        payload.docId || payload.automationId || payload.documentName || `doc-${Date.now()}`;

      return {
        type: 'document.generated',
        id: `doc-generated-${documentId}-${Date.now()}`,
        output: {
          pdfUrl: payload.pdfUrl,
          googleDocUrl: payload.googleDocUrl,
          documentName: payload.documentName,
          automationId: payload.docId || payload.automationId,
          additionalParams: payload.additionalParams || payload.webhookParams
        }
      };
    }
  })
  .build();
