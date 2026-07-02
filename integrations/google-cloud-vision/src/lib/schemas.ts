import { z } from 'zod';

export let imageSourceSchema = z
  .object({
    base64Content: z
      .string()
      .optional()
      .describe('Base64-encoded image data (without the data URI prefix)'),
    gcsUri: z
      .string()
      .optional()
      .describe('Google Cloud Storage URI (e.g., gs://bucket-name/image.jpg)'),
    imageUrl: z.string().optional().describe('Publicly accessible URL of the image')
  })
  .describe('Image source - provide exactly one of base64Content, gcsUri, or imageUrl');

export let boundingPolySchema = z.object({
  vertices: z
    .array(
      z.object({
        x: z.number().optional().describe('X coordinate'),
        y: z.number().optional().describe('Y coordinate')
      })
    )
    .describe('Bounding polygon vertices'),
  normalizedVertices: z
    .array(
      z.object({
        x: z.number().optional().describe('Normalized X coordinate (0-1)'),
        y: z.number().optional().describe('Normalized Y coordinate (0-1)')
      })
    )
    .optional()
    .describe('Normalized bounding polygon vertices')
});

export let likelihoodSchema = z.enum([
  'UNKNOWN',
  'VERY_UNLIKELY',
  'UNLIKELY',
  'POSSIBLE',
  'LIKELY',
  'VERY_LIKELY'
]);
