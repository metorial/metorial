import { createBase64Attachment } from 'slates';
import { z } from 'zod';
import type { Api2PdfClient } from '../lib/client';
import { api2PdfServiceError } from '../lib/errors';
import type { Api2PdfFileAttachment, Api2PdfResponse } from '../lib/types';

export let api2PdfFileOutputSchema = z.object({
  responseId: z
    .string()
    .describe('Unique ID for this request, can be used to delete the file later'),
  fileUrl: z.string().describe('API2PDF URL for the generated file'),
  mbOut: z.number().describe('Size of the generated file in megabytes, reported by API2PDF'),
  cost: z.number().describe('Cost of this API call in USD'),
  seconds: z.number().describe('Processing time in seconds'),
  mimeType: z.string().describe('MIME type of the returned Slate attachment'),
  byteLength: z.number().describe('Decoded byte length of the returned attachment'),
  attachmentCount: z.number().describe('Number of Slate attachments returned')
});

export let requireApi2PdfSuccess = (result: Api2PdfResponse, fallback: string) => {
  if (!result.success) {
    throw api2PdfServiceError(result.error || fallback);
  }

  if (!result.fileUrl) {
    throw api2PdfServiceError('API2PDF succeeded but did not return a generated file URL.');
  }
};

export let fetchApi2PdfAttachment = async (
  client: Api2PdfClient,
  result: Api2PdfResponse,
  fallback: string
) => {
  requireApi2PdfSuccess(result, fallback);
  return await client.downloadFile(result.fileUrl);
};

export let fileOutput = (result: Api2PdfResponse, file: Api2PdfFileAttachment) => ({
  responseId: result.responseId,
  fileUrl: result.fileUrl,
  mbOut: result.mbOut,
  cost: result.cost,
  seconds: result.seconds,
  mimeType: file.mimeType,
  byteLength: file.byteLength,
  attachmentCount: 1
});

export let fileAttachment = (file: Api2PdfFileAttachment) =>
  createBase64Attachment(file.contentBase64, file.mimeType);
