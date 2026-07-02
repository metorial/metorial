import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let pdfCreated = SlateTrigger.create(spec, {
  name: 'PDF Created',
  key: 'pdf_created',
  description:
    'Triggered when a new PDF is generated from a template. Receives the template ID and either the base64-encoded PDF content or a temporary download URL. Webhooks must be configured manually in the PDF-API.io dashboard.'
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template the PDF was generated from'),
      pdfBase64: z.string().optional().describe('Base64-encoded PDF content'),
      pdfUrl: z
        .string()
        .optional()
        .describe('Temporary download URL for the PDF, valid for 15 minutes')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the template the PDF was generated from'),
      pdfBase64: z
        .string()
        .optional()
        .describe('Base64-encoded PDF content, if included in the webhook payload'),
      pdfUrl: z
        .string()
        .optional()
        .describe(
          'Temporary download URL for the generated PDF, if included in the webhook payload'
        )
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let templateId = (data.template_id ?? data.templateId ?? '') as string;
      let pdfBase64 = (data.data ?? data.pdf ?? data.base64 ?? data.pdf_base64) as
        | string
        | undefined;
      let pdfUrl = (data.url ?? data.pdf_url ?? data.download_url) as string | undefined;

      // Determine what we received - base64 content or URL
      let isUrl = typeof pdfUrl === 'string' && pdfUrl.startsWith('http');

      return {
        inputs: [
          {
            templateId,
            pdfBase64: isUrl ? undefined : (pdfBase64 as string | undefined),
            pdfUrl: isUrl ? pdfUrl : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventId = `pdf_created_${ctx.input.templateId}_${Date.now()}`;

      return {
        type: 'pdf.created',
        id: eventId,
        output: {
          templateId: ctx.input.templateId,
          pdfBase64: ctx.input.pdfBase64,
          pdfUrl: ctx.input.pdfUrl
        }
      };
    }
  })
  .build();
