import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newVideo = SlateTrigger.create(spec, {
  name: 'New Video',
  key: 'new_video',
  description:
    'Triggers when a new video is uploaded to VEO. Polls for recently created videos and emits events for newly detected ones.'
})
  .input(
    z.object({
      videoId: z.string().describe('ID of the video'),
      title: z.string().describe('Title of the video'),
      uploadedStamp: z.string().describe('Upload timestamp'),
      video: z.record(z.string(), z.any()).describe('Full video object')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('ID of the new video'),
      title: z.string().describe('Title of the video'),
      uploadedStamp: z.string().describe('When the video was uploaded'),
      video: z.record(z.string(), z.any()).describe('Full video details')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

      let result = await client.listVideos({
        createdByMe: true,
        pageSize: 50,
        pageNumber: 1,
        orderByDirection: 'DESC',
        orderBy: 'UPLOADEDSTAMP'
      });

      let items: Record<string, unknown>[] = result.Items ?? result.items ?? [];
      let lastSeenId = ctx.state?.lastSeenId as string | undefined;
      let newItems: Record<string, unknown>[] = [];

      for (let item of items) {
        let itemId = String(item.Id ?? item.id ?? '');
        if (itemId === lastSeenId) break;
        newItems.push(item);
      }

      let firstItem = items[0];
      let newestId = firstItem ? String(firstItem.Id ?? firstItem.id ?? '') : lastSeenId;

      return {
        inputs: newItems.map(item => ({
          videoId: String(item.Id ?? item.id ?? ''),
          title: String(item.Title ?? item.title ?? ''),
          uploadedStamp: String(item.UploadedStamp ?? item.uploadedStamp ?? ''),
          video: item
        })),
        updatedState: {
          lastSeenId: newestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'video.created',
        id: ctx.input.videoId,
        output: {
          videoId: ctx.input.videoId,
          title: ctx.input.title,
          uploadedStamp: ctx.input.uploadedStamp,
          video: ctx.input.video
        }
      };
    }
  })
  .build();
