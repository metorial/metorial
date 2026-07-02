import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getYouTubePlaylist = SlateTool.create(spec, {
  name: 'Get YouTube Playlist',
  key: 'get_youtube_playlist',
  description: `Fetch metadata and video list from a YouTube playlist. Returns playlist info (title, description, video count, etc.) and optionally the list of video IDs in the playlist.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('YouTube playlist URL or ID'),
      includeVideos: z
        .boolean()
        .optional()
        .describe('If true, also fetch the list of video IDs from the playlist'),
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
      playlistId: z.string().optional().describe('YouTube playlist ID'),
      title: z.string().optional().describe('Playlist title'),
      description: z.string().optional().describe('Playlist description'),
      videoCount: z.number().optional().describe('Total number of videos in the playlist'),
      channelName: z.string().optional().describe('Channel name that owns the playlist'),
      channelId: z.string().optional().describe('Channel ID'),
      thumbnail: z.string().optional().describe('Playlist thumbnail URL'),
      videoIds: z
        .array(z.string())
        .optional()
        .describe('List of video IDs in the playlist (when includeVideos is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let playlist = await client.getYouTubePlaylist({ url: ctx.input.url });

    let videoIds: string[] | undefined;
    if (ctx.input.includeVideos) {
      let videosResult = await client.getYouTubePlaylistVideos({
        url: ctx.input.url,
        limit: ctx.input.videoLimit
      });
      videoIds = videosResult.videoIds ?? videosResult.videos ?? videosResult;
      if (!Array.isArray(videoIds)) {
        videoIds = [];
      }
    }

    return {
      output: {
        playlistId: playlist.id ?? playlist.playlistId,
        title: playlist.title ?? playlist.name,
        description: playlist.description,
        videoCount: playlist.videoCount,
        channelName: playlist.channelName ?? playlist.channel?.name,
        channelId: playlist.channelId ?? playlist.channel?.id,
        thumbnail: playlist.thumbnail,
        videoIds
      },
      message: `Playlist **${playlist.title ?? playlist.name ?? 'unknown'}** — ${playlist.videoCount ?? 0} videos${videoIds ? `, ${videoIds.length} video IDs retrieved` : ''}.`
    };
  })
  .build();
