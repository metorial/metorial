import { z } from 'zod';

export let imageRenditionSchema = z
  .object({
    url: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    size: z.string().optional(),
    mp4: z.string().optional(),
    mp4_size: z.string().optional(),
    webp: z.string().optional(),
    webp_size: z.string().optional()
  })
  .passthrough();

export let gifImageSchema = z
  .object({
    original: imageRenditionSchema.optional(),
    fixed_height: imageRenditionSchema.optional(),
    fixed_height_small: imageRenditionSchema.optional(),
    fixed_width: imageRenditionSchema.optional(),
    fixed_width_small: imageRenditionSchema.optional(),
    downsized: imageRenditionSchema.optional(),
    downsized_medium: imageRenditionSchema.optional(),
    downsized_large: imageRenditionSchema.optional(),
    preview_gif: imageRenditionSchema.optional(),
    preview_webp: imageRenditionSchema.optional()
  })
  .passthrough();

export let userSchema = z
  .object({
    avatarUrl: z.string().optional(),
    bannerImage: z.string().optional(),
    bannerUrl: z.string().optional(),
    profileUrl: z.string().optional(),
    username: z.string().optional(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    isVerified: z.boolean().optional()
  })
  .optional();

export let gifSchema = z.object({
  gifId: z.string(),
  type: z.string().optional(),
  slug: z.string().optional(),
  url: z.string().optional(),
  bitlyUrl: z.string().optional(),
  embedUrl: z.string().optional(),
  username: z.string().optional(),
  source: z.string().optional(),
  title: z.string().optional(),
  rating: z.string().optional(),
  importDatetime: z.string().optional(),
  trendingDatetime: z.string().optional(),
  images: gifImageSchema.optional(),
  user: userSchema
});

export let paginationSchema = z.object({
  totalCount: z.number().optional(),
  count: z.number().optional(),
  offset: z.number().optional()
});

export type GifObject = z.infer<typeof gifSchema>;
export type PaginationInfo = z.infer<typeof paginationSchema>;

export let ratingEnum = z.enum(['g', 'pg', 'pg-13', 'r']).optional();
