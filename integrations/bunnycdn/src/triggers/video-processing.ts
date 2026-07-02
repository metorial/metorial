import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let VIDEO_STATUS_MAP: Record<number, string> = {
  0: 'queued',
  1: 'processing',
  2: 'encoding',
  3: 'finished',
  4: 'resolution_finished',
  5: 'failed',
  6: 'presigned_upload_started',
  7: 'presigned_upload_finished',
  8: 'presigned_upload_failed',
  9: 'captions_generated',
  10: 'title_or_description_generated'
};

export let videoProcessing = SlateTrigger.create(spec, {
  name: 'Video Processing Status',
  key: 'video_processing',
  description:
    'Triggers when a video processing status changes in a Bunny Stream library. Covers all lifecycle events including queued, processing, encoding, finished, failed, resolution finished, pre-signed upload events, caption generation, and title/description generation. Configure the webhook URL in your video library settings using the Manage Video Library tool or the bunny.net dashboard.'
})
  .input(
    z.object({
      videoLibraryId: z.number().describe('Video library ID'),
      videoGuid: z.string().describe('Video GUID'),
      statusCode: z.number().describe('Numeric status code'),
      statusName: z.string().describe('Human-readable status name')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Video GUID'),
      videoLibraryId: z.number().describe('Video library ID'),
      statusCode: z.number().describe('Numeric status code'),
      statusName: z
        .string()
        .describe(
          'Human-readable status name (queued, processing, encoding, finished, resolution_finished, failed, presigned_upload_started, presigned_upload_finished, presigned_upload_failed, captions_generated, title_or_description_generated)'
        )
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        VideoLibraryId: number;
        VideoGuid: string;
        Status: number;
      };

      let statusCode = data.Status;
      let statusName = VIDEO_STATUS_MAP[statusCode] || `unknown_${statusCode}`;

      return {
        inputs: [
          {
            videoLibraryId: data.VideoLibraryId,
            videoGuid: data.VideoGuid,
            statusCode,
            statusName
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `video.${ctx.input.statusName}`,
        id: `${ctx.input.videoGuid}-${ctx.input.statusCode}-${Date.now()}`,
        output: {
          videoId: ctx.input.videoGuid,
          videoLibraryId: ctx.input.videoLibraryId,
          statusCode: ctx.input.statusCode,
          statusName: ctx.input.statusName
        }
      };
    }
  })
  .build();
