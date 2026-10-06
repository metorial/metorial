import { z } from 'zod';
import { decodeImage, type ImageResult } from './client';

export let aspectRatioSchema = z.enum([
  '1:1',
  '16:9',
  '21:9',
  '2:3',
  '3:2',
  '4:5',
  '5:4',
  '9:16',
  '9:21'
]);
export let outputFormatSchema = z.enum(['png', 'jpeg', 'webp']).default('png');
export let seedSchema = z.number().int().min(0).max(4294967294).optional();
export let stylePresetSchema = z
  .enum([
    '3d-model',
    'analog-film',
    'anime',
    'cinematic',
    'comic-book',
    'digital-art',
    'enhance',
    'fantasy-art',
    'isometric',
    'line-art',
    'low-poly',
    'modeling-compound',
    'neon-punk',
    'origami',
    'photographic',
    'pixel-art',
    'tile-texture'
  ])
  .optional();
export let imageFileOutputSchema = z.object({
  status: z.enum(['complete', 'in-progress']),
  generationId: z
    .string()
    .optional()
    .describe('Job ID to pass to get_generation_result while processing or within 24 hours'),
  fileName: z.string().optional().describe('Name of the completed image file'),
  mimeType: z.string().optional().describe('Media type of the completed image file'),
  seed: z
    .number()
    .optional()
    .describe('Randomness seed reported by the provider, when available'),
  finishReason: z.string().optional().describe('Provider generation finish reason')
});

export let imageFile = (result: ImageResult, prefix: string, generationId?: string) => {
  let { bytes, mimeType } = decodeImage(
    result.base64,
    'generated image',
    Number.POSITIVE_INFINITY
  );
  let fileName = `${prefix}.${mimeType.split('/')[1]}`;
  return {
    output: {
      status: 'complete' as const,
      generationId,
      fileName,
      mimeType,
      seed: result.seed || undefined,
      finishReason: result.finishReason
    },
    content: new Response(new Uint8Array(bytes), { headers: { 'content-type': mimeType } })
  };
};

export let generationDownload = (generationId: string, token: string, mimeType: string) => ({
  type: 'url' as const,
  url: `https://api.stability.ai/v2beta/results/${encodeURIComponent(generationId)}`,
  headers: { Authorization: `Bearer ${token}`, Accept: 'image/*' },
  mimeType
});
