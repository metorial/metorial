import { z } from 'zod';

export let lookupTypeSchema = z.enum(['domain', 'ticker', 'crypto', 'isin', 'name']);

export let imageSourceSchema = z.object({
  width: z.number(),
  height: z.number(),
  format: z.string().optional(),
  has_transparency: z.boolean(),
  is_vector: z.boolean()
});

export let imageMetadataSchema = z.object({
  etag: z.string(),
  blurhash: z.string(),
  source: imageSourceSchema,
  last_updated_at: z.string().nullable(),
  expires_at: z.string()
});

export let imageSchema = imageMetadataSchema.extend({ url: z.string().url() });

export let colorSchema = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
  hex: z.string(),
  oklch: z.object({ l: z.number(), c: z.number(), h: z.number() })
});

export let brandMetadataSchema = z.object({
  object: z.literal('brand'),
  id: z.string().min(1),
  slug: z.string(),
  domain: z.string().nullable(),
  status: z.literal('ready'),
  name: z.string().min(1),
  description: z.string().nullable(),
  indexed_at: z.string(),
  is_profane: z.boolean(),
  socials: z.record(z.string(), z.string()),
  colors: z.array(colorSchema),
  logo: imageMetadataSchema.nullable(),
  brandmark: imageMetadataSchema.nullable(),
  social_banners: z.array(imageMetadataSchema)
});

export let brandSchema = brandMetadataSchema.extend({
  logo: imageSchema.nullable(),
  brandmark: imageSchema.nullable(),
  social_banners: z.array(imageSchema)
});

export let imageResourceSchema = imageSchema.extend({
  object: z.literal('image'),
  kind: z.enum(['logo', 'brandmark']),
  brand_id: z.string().min(1),
  status: z.literal('ready')
});

export let pendingSchema = z.object({
  reason: z.enum(['indexing', 'resolving']),
  message: z.string(),
  retry_after_seconds: z.number(),
  expires_in_seconds: z.number(),
  webhook: z.boolean(),
  doc_url: z.string()
});

export let metadataSchema = z
  .object({
    request_id: z.string().min(1),
    resolution: z
      .object({
        type: z.string(),
        value: z.string(),
        method: z.string(),
        context: z.record(z.string(), z.unknown())
      })
      .passthrough()
      .optional(),
    pending: pendingSchema.optional(),
    subscription: z
      .object({ status: z.string(), message: z.string().optional() })
      .passthrough()
      .optional()
  })
  .passthrough();

export let unsettledSchema = z.object({
  object: z.enum(['brand', 'image']),
  status: z.enum(['not_indexed', 'not_found'])
});

export let imageDownloadOptionsSchema = z.object({
  format: z.enum(['jpg', 'png', 'webp']).optional(),
  size: z.number().int().min(1).max(800).optional(),
  theme: z.enum(['light', 'dark']).optional()
});

export let imageReferenceSchema = z.object({
  brandId: z.string().min(1),
  kind: z.enum(['logo', 'brandmark']),
  options: imageDownloadOptionsSchema
});
