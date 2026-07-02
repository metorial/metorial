import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getYouTubeChannel = SlateTool.create(spec, {
  name: 'Get YouTube Channel',
  key: 'get_youtube_channel',
  description: `Fetch metadata and video list from a YouTube channel. Returns channel info (name, description, subscribers, etc.) and optionally a list of video IDs.
Combine channel metadata retrieval with video listing in a single tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('YouTube channel URL, ID, or handle (e.g. "@channelname")'),
      includeVideos: z
        .boolean()
        .optional()
        .describe('If true, also fetch the list of video IDs from the channel'),
      videoType: z
        .enum(['video', 'short', 'live', 'all'])
        .optional()
        .describe('Type of videos to fetch (only used when includeVideos is true)'),
      videoLimit: z
        .number()
        .optional()
        .describe(
          'Maximum number of video IDs to return (only used when includeVideos is true)'
        )
    })
  )
  .output(
    z.object({
      channelId: z.string().optional().describe('YouTube channel ID'),
      channelName: z.string().optional().describe('Channel name'),
      description: z.string().optional().describe('Channel description'),
      subscriberCount: z.number().optional().describe('Number of subscribers'),
      videoCount: z.number().optional().describe('Total number of videos'),
      viewCount: z.number().optional().describe('Total view count'),
      thumbnail: z.string().optional().describe('Channel thumbnail/avatar URL'),
      createdAt: z.string().optional().describe('Channel creation date'),
      videoIds: z
        .array(z.string())
        .optional()
        .describe('List of video IDs from the channel (when includeVideos is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let channel = await client.getYouTubeChannel({ url: ctx.input.url });

    let videoIds: string[] | undefined;
    if (ctx.input.includeVideos) {
      let videosResult = await client.getYouTubeChannelVideos({
        url: ctx.input.url,
        type: ctx.input.videoType,
        limit: ctx.input.videoLimit
      });
      videoIds = videosResult.videoIds ?? videosResult.videos ?? videosResult;
      if (!Array.isArray(videoIds)) {
        videoIds = [];
      }
    }

    return {
      output: {
        channelId: channel.id ?? channel.channelId,
        channelName: channel.name ?? channel.channelName,
        description: channel.description,
        subscriberCount: channel.subscriberCount ?? channel.subscribers,
        videoCount: channel.videoCount,
        viewCount: channel.viewCount,
        thumbnail: channel.thumbnail ?? channel.avatar,
        createdAt: channel.createdAt ?? channel.publishedAt,
        videoIds
      },
      message: `Channel **${channel.name ?? channel.channelName ?? 'unknown'}** — ${channel.subscriberCount ?? channel.subscribers ?? 0} subscribers${videoIds ? `, ${videoIds.length} video IDs retrieved` : ''}.`
    };
  })
  .build();
