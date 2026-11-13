import { z } from 'zod';

export const youtubeTimestampSchema = z.iso.datetime({ offset: true });
export const youtubeResourceIdSchema = z.string().trim().min(1).max(256);

export const uploadActivityOutputSchema = z.object({
  activityId: youtubeResourceIdSchema.describe('YouTube upload activity ID.'),
  channelId: youtubeResourceIdSchema.describe('Channel that owns the uploaded video.'),
  videoId: youtubeResourceIdSchema.describe('Video ID for subsequent video tools.'),
  title: z.string().optional(),
  description: z.string().optional(),
  activityPublishedAt: youtubeTimestampSchema.describe(
    'When YouTube says the upload activity occurred; not a private-to-public transition.'
  ),
  observedAt: youtubeTimestampSchema.describe('When this upload activity was observed.'),
  videoUrl: z.url()
});

export const uploadActivityEventSchema = uploadActivityOutputSchema.extend({
  type: z.literal('video.uploaded')
});
export type UploadActivityEvent = z.infer<typeof uploadActivityEventSchema>;

export const uploadActivityId = (event: { channelId: string; videoId: string }) =>
  JSON.stringify([event.channelId, event.videoId]);
