import { z } from 'zod';

export const mediaSchema = z.object({
  link: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  picture: z.string().optional(),
  photo: z.string().optional(),
  thumbnail: z.string().optional()
});
export const assetsSchema = z
  .array(
    z.object({
      image: z
        .object({
          url: z.string(),
          thumbnailUrl: z.string().optional(),
          metadata: z.object({ altText: z.string() }).optional()
        })
        .optional(),
      video: z.object({ url: z.string() }).optional(),
      document: z
        .object({ url: z.string(), title: z.string(), thumbnailUrl: z.string() })
        .optional()
    })
  )
  .describe(
    'Publicly accessible image, video or document files. Each asset must specify exactly one type.'
  );
export const metadataSchema = z
  .record(z.string(), z.unknown())
  .describe('Network-specific metadata using the current Buffer PostInputMetaData fields.');
export const scheduleSchema = z.object({
  days: z.array(z.string()),
  times: z.array(z.string()),
  paused: z
    .boolean()
    .optional()
    .describe('Whether this day is paused, when supplied by the current API.')
});
export const updateSchema = z.object({
  updateId: z.string(),
  text: z.string(),
  status: z.string(),
  profileId: z.string(),
  profileService: z.string().optional(),
  createdAt: z.number().optional().describe('Unix seconds supplied by the provider.'),
  dueAt: z.number().optional().describe('Unix seconds, omitted when unscheduled.'),
  sentAt: z.number().optional().describe('Unix seconds, omitted when unpublished.'),
  day: z.string().optional(),
  dueTime: z.string().optional(),
  serviceUpdateId: z.string().optional(),
  statistics: z.record(z.string(), z.number()).optional(),
  media: mediaSchema.optional(),
  externalUrl: z.string().optional(),
  authorId: z.string().optional()
});
export const pageInfoSchema = z.object({
  hasNextPage: z.boolean(),
  endCursor: z.string().optional()
});
