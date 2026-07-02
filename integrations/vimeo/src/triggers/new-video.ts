import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import { mapVideo, videoSchema } from '../lib/schemas';
import { spec } from '../spec';

export let newVideoTrigger = SlateTrigger.create(spec, {
  name: 'New Video Uploaded',
  key: 'new_video',
  description:
    "[Polling fallback] Triggers when a new video is uploaded to the authenticated user's account. Uses polling to detect new uploads."
})
  .input(
    z.object({
      videoId: z.string().describe('The video ID'),
      video: z.any().describe('Raw video data from the API')
    })
  )
  .output(videoSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new VimeoClient(ctx.auth.token);
      let lastChecked = (ctx.state as any)?.lastChecked as string | undefined;

      let result = await client.listMyVideos({
        sort: 'date',
        direction: 'desc',
        perPage: 25
      });

      let videos = result.data ?? [];
      let newVideos = lastChecked
        ? videos.filter((v: any) => v.created_time && v.created_time > lastChecked)
        : [];

      // On first run, don't return existing videos as new events
      let latestTimestamp = videos.length > 0 ? videos[0].created_time : lastChecked;

      return {
        inputs: newVideos.map((v: any) => ({
          videoId: v.uri?.replace('/videos/', '') ?? '',
          video: v
        })),
        updatedState: {
          lastChecked: latestTimestamp ?? new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let mapped = mapVideo(ctx.input.video);

      return {
        type: 'video.created',
        id: ctx.input.videoId,
        output: mapped
      };
    }
  })
  .build();
