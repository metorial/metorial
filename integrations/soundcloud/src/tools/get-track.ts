import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTrack = SlateTool.create(spec, {
  name: 'Get Track',
  key: 'get_track',
  description: `Retrieve detailed information about a SoundCloud track by its ID or URN. Includes metadata, play counts, access level, and available stream URLs.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      trackId: z
        .string()
        .describe('Track ID or URN (e.g., "123456" or "soundcloud:tracks:123456")'),
      includeStreams: z
        .boolean()
        .optional()
        .describe('Whether to include stream URLs in the response (default false)')
    })
  )
  .output(
    z.object({
      trackId: z.string().describe('Unique identifier (URN) of the track'),
      title: z.string().describe('Title of the track'),
      description: z.string().nullable().describe('Track description'),
      permalinkUrl: z.string().describe('URL to the track on SoundCloud'),
      duration: z.number().describe('Duration in milliseconds'),
      genre: z.string().nullable().describe('Genre'),
      tags: z.string().describe('Space-separated list of tags'),
      artworkUrl: z.string().nullable().describe('URL to track artwork'),
      waveformUrl: z.string().nullable().describe('URL to waveform image'),
      playbackCount: z.number().describe('Number of plays'),
      likesCount: z.number().describe('Number of likes'),
      repostsCount: z.number().describe('Number of reposts'),
      commentsCount: z.number().describe('Number of comments'),
      downloadCount: z.number().describe('Number of downloads'),
      access: z.string().describe('Access level: playable, preview, or blocked'),
      sharing: z.string().describe('Sharing setting: public or private'),
      streamable: z.boolean().describe('Whether the track is streamable'),
      downloadable: z.boolean().describe('Whether the track is downloadable'),
      license: z.string().describe('License type'),
      bpm: z.number().nullable().describe('Beats per minute'),
      isrc: z.string().nullable().describe('International Standard Recording Code'),
      createdAt: z.string().describe('When the track was created'),
      lastModified: z.string().describe('When the track was last modified'),
      username: z.string().describe('Username of the track uploader'),
      userId: z.string().describe('User ID of the track uploader'),
      streams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Available stream URLs keyed by format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let track = await client.getTrack(ctx.input.trackId);

    let streams: Record<string, string> | undefined;
    if (ctx.input.includeStreams && track.access === 'playable') {
      try {
        let streamData = await client.getTrackStreams(ctx.input.trackId);
        streams = {};
        for (let [key, value] of Object.entries(streamData)) {
          if (value) streams[key] = value;
        }
      } catch {
        // Stream URLs may not be available for all tracks
      }
    }

    return {
      output: {
        trackId: track.urn || String(track.id),
        title: track.title,
        description: track.description,
        permalinkUrl: track.permalink_url,
        duration: track.duration,
        genre: track.genre,
        tags: track.tag_list,
        artworkUrl: track.artwork_url,
        waveformUrl: track.waveform_url,
        playbackCount: track.playback_count,
        likesCount: track.likes_count,
        repostsCount: track.reposts_count,
        commentsCount: track.comment_count,
        downloadCount: track.download_count,
        access: track.access,
        sharing: track.sharing,
        streamable: track.streamable,
        downloadable: track.downloadable,
        license: track.license,
        bpm: track.bpm,
        isrc: track.isrc,
        createdAt: track.created_at,
        lastModified: track.last_modified,
        username: track.user?.username || '',
        userId: track.user?.urn || String(track.user?.id),
        streams
      },
      message: `Retrieved track **"${track.title}"** by ${track.user?.username || 'unknown'} (${track.access}).`
    };
  })
  .build();
