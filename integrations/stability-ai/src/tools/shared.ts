import { createBase64Attachment } from 'slates';
import { z } from 'zod';
import type { MediaResult } from '../lib/client';

export let aspectRatioEnum = z
  .enum(['16:9', '1:1', '21:9', '2:3', '3:2', '4:5', '5:4', '9:16', '9:21'])
  .optional()
  .describe('Aspect ratio of the generated image. Defaults to 1:1.');

export let imageOutputFormatEnum = z
  .enum(['png', 'jpeg', 'webp'])
  .optional()
  .describe('Output image format. Defaults to png.');

export let audioOutputFormatEnum = z
  .enum(['mp3', 'wav'])
  .optional()
  .describe('Output audio format. Defaults to mp3.');

export let stylePresetEnum = z
  .enum([
    'enhance',
    'anime',
    'photographic',
    'digital-art',
    'comic-book',
    'fantasy-art',
    'line-art',
    'analog-film',
    'neon-punk',
    'isometric',
    'low-poly',
    'origami',
    'modeling-compound',
    'cinematic',
    '3d-model',
    'pixel-art',
    'tile-texture'
  ])
  .optional()
  .describe('Visual style preset to apply when supported by the selected operation.');

export let mediaAttachmentOutputSchema = z.object({
  attachmentIndex: z.number().describe('Index of the generated media attachment.'),
  attachmentCount: z.number().describe('Number of generated media attachments returned.'),
  mimeType: z.string().describe('MIME type of the generated attachment.'),
  byteLength: z.number().describe('Decoded byte length of the generated attachment.'),
  seed: z.number().optional().describe('Seed used for the generation, when returned.'),
  finishReason: z
    .string()
    .optional()
    .describe('Reason the generation finished, when returned.'),
  generationId: z
    .string()
    .optional()
    .describe('Async Stability AI generation ID, when the API returned one.')
});

export let toMediaAttachmentOutput = (result: MediaResult) => ({
  attachmentIndex: 0,
  attachmentCount: 1,
  mimeType: result.mimeType,
  byteLength: result.byteLength,
  seed: result.seed,
  finishReason: result.finishReason,
  generationId: result.generationId
});

export let createMediaAttachment = (result: MediaResult) =>
  createBase64Attachment(result.contentBase64, result.mimeType);
