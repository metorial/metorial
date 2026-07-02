import { createBase64Attachment, getBase64ByteLength } from 'slates';
import { z } from 'zod';
import type { FileResponse } from '../lib/client';
import { browserlessServiceError } from '../lib/errors';

export let waitUntilSchema = z
  .enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
  .describe('Browser navigation completion event');

export let gotoOptionsSchema = z
  .object({
    waitUntil: z
      .union([waitUntilSchema, z.array(waitUntilSchema)])
      .optional()
      .describe('When to consider navigation complete'),
    timeout: z.number().optional().describe('Navigation timeout in milliseconds')
  })
  .optional()
  .describe('Navigation options');

export let waitForSelectorSchema = z
  .object({
    selector: z.string().describe('CSS selector to wait for'),
    timeout: z.number().optional().describe('Timeout in milliseconds'),
    visible: z.boolean().optional().describe('Wait for element to be visible'),
    hidden: z.boolean().optional().describe('Wait for element to be hidden')
  })
  .optional()
  .describe('Wait for a CSS selector before continuing');

export let fileOutputSchema = z.object({
  mimeType: z.string().describe('MIME type of the returned Slate attachment'),
  byteLength: z.number().describe('Decoded byte length of the returned attachment'),
  filename: z.string().optional().describe('Filename reported by Browserless, when available'),
  attachmentCount: z.number().describe('Number of Slate attachments returned')
});

export let fileOutput = (file: FileResponse) => ({
  mimeType: file.mimeType,
  byteLength: file.byteLength,
  filename: file.filename,
  attachmentCount: 1
});

export let fileAttachment = (file: FileResponse) =>
  createBase64Attachment(file.contentBase64, file.mimeType);

export let base64FileAttachment = (contentBase64: string, mimeType: string) =>
  createBase64Attachment(contentBase64, mimeType);

export let base64ByteLength = getBase64ByteLength;

export let requireHttpUrl = (value: string | undefined, label = 'url') => {
  if (!value) {
    throw browserlessServiceError(`${label} is required.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw browserlessServiceError(`${label} must be a valid URL.`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw browserlessServiceError(`${label} must use http:// or https://.`);
  }
};

export let requireExactlyOneSource = (input: { url?: string; html?: string }) => {
  let hasUrl = Boolean(input.url);
  let hasHtml = Boolean(input.html);

  if (hasUrl === hasHtml) {
    throw browserlessServiceError('Provide exactly one of url or html.');
  }

  if (input.url) {
    requireHttpUrl(input.url);
  }
};

export let requireSmartScrapeSuccess = (result: { ok?: boolean; message?: string | null }) => {
  if (result.ok === false) {
    throw browserlessServiceError(
      result.message || 'Browserless smart scrape did not succeed.'
    );
  }
};
