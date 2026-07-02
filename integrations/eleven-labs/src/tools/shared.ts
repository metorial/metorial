import { createBase64Attachment } from 'slates';
import { z } from 'zod';
import type { AudioResult } from '../lib/client';

export let voiceSettingsSchema = z.object({
  stability: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Voice stability (0-1). Lower values add more variability.'),
  similarityBoost: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      'Similarity boost (0-1). Higher values are more faithful to the original voice.'
    ),
  style: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Style exaggeration (0-1). Higher values amplify the voice style.'),
  useSpeakerBoost: z
    .boolean()
    .optional()
    .describe('Enable speaker boost for enhanced clarity'),
  speed: z
    .number()
    .min(0.25)
    .max(4.0)
    .optional()
    .describe('Speed multiplier (0.25-4.0). 1.0 is normal speed.')
});

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
