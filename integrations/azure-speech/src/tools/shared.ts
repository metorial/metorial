import { createBase64Attachment } from 'slates';
import { z } from 'zod';

export type AudioResult = {
  contentBase64: string;
  contentType: string;
  byteLength: number;
};

export let audioOutputSchema = z.object({
  contentType: z.string().describe('MIME type of the returned audio attachment'),
  byteLength: z.number().describe('Decoded audio byte length'),
  attachmentCount: z.number().describe('Number of audio attachments returned')
});

export let audioOutput = (result: AudioResult) => ({
  contentType: result.contentType,
  byteLength: result.byteLength,
  attachmentCount: 1
});

export let audioAttachment = (result: AudioResult) =>
  createBase64Attachment(result.contentBase64, result.contentType);
