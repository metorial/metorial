import { createBase64Attachment } from 'slates';
import { z } from 'zod';
import type { PdfOutputOption, PdfResult } from '../lib/client';
import { pdfApiIoServiceError } from '../lib/errors';

export let pdfDeliverySchema = z
  .enum(['attachment', 'url', 'base64'])
  .default('attachment')
  .describe(
    '"attachment" returns PDF bytes as a Slate attachment. "url" returns a temporary download URL. "base64" is a deprecated alias for attachment and does not return inline base64.'
  );

export let pdfOutputSchema = z.object({
  delivery: z.enum(['attachment', 'url']).describe('How the generated PDF was returned'),
  downloadUrl: z
    .string()
    .nullable()
    .describe('Temporary PDF download URL when delivery is "url"'),
  mimeType: z
    .string()
    .nullable()
    .describe('MIME type of the returned attachment when delivery is "attachment"'),
  byteLength: z
    .number()
    .nullable()
    .describe('Decoded byte length of the returned attachment when delivery is "attachment"'),
  attachmentCount: z.number().describe('Number of Slate attachments returned')
});

export let outputOptionForDelivery = (
  outputFormat: 'attachment' | 'url' | 'base64'
): PdfOutputOption => (outputFormat === 'url' ? 'url' : 'pdf');

export let pdfOutput = (result: PdfResult) => ({
  delivery: result.kind === 'url' ? ('url' as const) : ('attachment' as const),
  downloadUrl: result.kind === 'url' ? result.url : null,
  mimeType: result.kind === 'attachment' ? result.mimeType : null,
  byteLength: result.kind === 'attachment' ? result.byteLength : null,
  attachmentCount: result.kind === 'attachment' ? 1 : 0
});

export let pdfAttachments = (result: PdfResult) =>
  result.kind === 'attachment'
    ? [createBase64Attachment(result.contentBase64, result.mimeType)]
    : [];

export let requireNonEmptyString = (value: string, label: string) => {
  let trimmed = value.trim();

  if (!trimmed) {
    throw pdfApiIoServiceError(`${label} is required.`);
  }

  return trimmed;
};
