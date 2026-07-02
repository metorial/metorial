import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { pdfApiIoServiceError } from '../lib/errors';
import { spec } from '../spec';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let readString = (record: Record<string, unknown>, keys: string[]) => {
  for (let key of keys) {
    let value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return undefined;
};

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

      if (typeof data.type === 'string' && data.type !== 'pdf.created') {
        throw pdfApiIoServiceError(`Unsupported PDF-API.io webhook event: ${data.type}`);
      }

      let payload = isRecord(data.data) ? data.data : data;
      let templateId = readString(payload, ['template_id', 'templateId']);
      let legacyBase64 = typeof data.data === 'string' ? data.data : undefined;
      let pdfBase64 =
        legacyBase64 ?? readString(payload, ['pdf', 'base64', 'pdf_base64', 'pdfBase64']);
      let pdfUrl = readString(payload, ['url', 'pdf_url', 'download_url', 'pdfUrl']);

      if (!templateId) {
        throw pdfApiIoServiceError('PDF-API.io webhook payload did not include template_id.');
      }

      if (!pdfBase64 && !pdfUrl) {
        throw pdfApiIoServiceError(
          'PDF-API.io webhook payload did not include PDF content or a download URL.'
        );
      }

      return {
        inputs: [
          {
            templateId,
            pdfBase64: pdfUrl ? undefined : pdfBase64,
            pdfUrl
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
