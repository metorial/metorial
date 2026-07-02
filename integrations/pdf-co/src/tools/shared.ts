import { createApiServiceError, createBase64Attachment } from 'slates';
import { z } from 'zod';
import type { Client } from '../lib/client';
import { pdfCoApiError } from '../lib/errors';
import type { PdfCoBaseResponse, PdfCoDownloadedFile, PdfCoFileResponse } from '../lib/types';

export let fileAttachmentOutputFields = {
  outputUrl: z
    .string()
    .describe('PDF.co temporary output URL, useful as sourceUrl for follow-up PDF.co tools'),
  outputLinkValidTill: z
    .string()
    .optional()
    .describe('When the PDF.co temporary output URL expires'),
  mimeType: z.string().describe('MIME type of the returned attachment'),
  byteLength: z.number().describe('Decoded byte length of the returned attachment'),
  attachmentCount: z.number().describe('Number of attachments returned')
};

export let createPdfCoAttachment = (file: PdfCoDownloadedFile) =>
  createBase64Attachment(file.contentBase64, file.mimeType);

export let assertPdfCoSuccess = <T extends PdfCoBaseResponse>(
  result: T,
  operation: string
) => {
  if (result.error) {
    throw pdfCoApiError(operation, result);
  }

  return result;
};

export let downloadPdfCoOutput = async (
  client: Client,
  result: PdfCoFileResponse,
  fallbackMimeType: string
) => {
  if (!result.url) {
    throw createApiServiceError('PDF.co did not return an output URL for the generated file.');
  }

  return client.downloadFileUrl(result.url, fallbackMimeType);
};

export let toFileOutput = (result: PdfCoFileResponse, file: PdfCoDownloadedFile) => ({
  outputUrl: result.url,
  outputLinkValidTill: result.outputLinkValidTill,
  pageCount: result.pageCount,
  creditsUsed: result.credits,
  remainingCredits: result.remainingCredits,
  mimeType: file.mimeType,
  byteLength: file.byteLength,
  attachmentCount: 1
});

export let conversionMimeType = (format: string) => {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'text':
      return 'text/plain';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xml':
      return 'application/xml';
    case 'html':
      return 'text/html';
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'tiff':
      return 'image/tiff';
    default:
      return 'application/octet-stream';
  }
};
