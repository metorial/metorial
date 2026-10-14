import { z } from 'zod';

export let imageFormatSchema = z
  .enum(['png', 'jpeg', 'webp', 'pdf'])
  .describe('Output file format. Defaults to JPEG; PDF contains one page.');

export let imageQualitySchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .describe('JPEG quality from 1 to 100. Ignored for PNG, WebP, and PDF.');

export let signedImageInputSchema = z.object({
  designId: z.string().describe('The unique ID of the Imejis.io design template to render.'),
  overrides: z
    .record(z.string(), z.unknown())
    .describe('Template component overrides. Supports nested objects and dot notation keys.'),
  format: imageFormatSchema.optional(),
  quality: imageQualitySchema.optional(),
  expiresIn: z
    .number()
    .int()
    .min(1)
    .max(10_080)
    .default(60)
    .describe('Signed URL lifetime in minutes, from 1 to 10080 (7 days). Defaults to 60.')
});
