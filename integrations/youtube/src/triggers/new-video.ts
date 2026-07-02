import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let newVideo = SlateTrigger.create(spec, {
  name: 'New Video Published',
  key: 'new_video',
  description:
    "Triggers when a new video is published on a specific YouTube channel. Polls the channel's uploads playlist for new videos."
})
  .scopes(youtubeActionScopes.newVideo)
  .input(
    z.object({
      videoId: z.string().describe('ID of the new video'),
      title: z.string().optional().describe('Video title'),
      description: z.string().optional().describe('Video description'),
      publishedAt: z.string().optional().describe('Video publish time'),
      channelId: z.string().optional().describe('Channel ID that uploaded the video'),
      channelTitle: z.string().optional().describe('Channel title')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('ID of the new video'),
      title: z.string().optional().describe('Video title'),
      description: z.string().optional().describe('Video description'),
      publishedAt: z.string().optional().describe('Video publish time'),
      channelId: z.string().optional().describe('Channel ID that uploaded the video'),
      channelTitle: z.string().optional().describe('Channel title')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = Client.fromAuth(ctx.auth);

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      let response = await client.search({
        part: ['snippet'],
        type: ['video'],
        order: 'date',
        publishedAfter: lastPolledAt,
        maxResults: 50
      });

      let now = new Date().toISOString();

      let inputs = response.items
        .filter(item => item.id.videoId)
        .map(item => ({
          videoId: item.id.videoId!,
          title: item.snippet?.title,
          description: item.snippet?.description,
          publishedAt: item.snippet?.publishedAt,
          channelId: item.snippet?.channelId,
          channelTitle: item.snippet?.channelTitle
        }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'video.published',
        id: ctx.input.videoId,
        output: {
          videoId: ctx.input.videoId,
          title: ctx.input.title,
          description: ctx.input.description,
          publishedAt: ctx.input.publishedAt,
          channelId: ctx.input.channelId,
          channelTitle: ctx.input.channelTitle
        }
      };
    }
  })
  .build();
