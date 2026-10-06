import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { downloadTrack } from '../lib/files';
import { fail } from '../lib/native';
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
      secretToken: z
        .string()
        .optional()
        .describe('Native secret token for authorized private-track access, when required'),
      download: z
        .boolean()
        .optional()
        .describe(
          'Deliver the provider-enabled original download, up to the local 16 MiB bound; no streaming conversion'
        ),
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
      description: z.string().nullable().optional().describe('Track description'),
      permalinkUrl: z
        .string()
        .nullable()
        .optional()
        .describe('URL to the track on SoundCloud'),
      duration: z.number().nullable().optional().describe('Duration in milliseconds'),
      genre: z.string().nullable().optional().describe('Genre'),
      tags: z.string().nullable().optional().describe('Space-separated list of tags'),
      artworkUrl: z.string().nullable().optional().describe('URL to track artwork'),
      waveformUrl: z.string().nullable().optional().describe('URL to waveform image'),
      playbackCount: z.number().nullable().optional().describe('Number of plays'),
      likesCount: z.number().nullable().optional().describe('Number of likes'),
      repostsCount: z.number().nullable().optional().describe('Number of reposts'),
      commentsCount: z.number().nullable().optional().describe('Number of comments'),
      downloadCount: z.number().nullable().optional().describe('Number of downloads'),
      access: z
        .string()
        .nullable()
        .optional()
        .describe('Access level: playable, preview, or blocked'),
      sharing: z.string().nullable().optional().describe('Sharing setting: public or private'),
      streamable: z.boolean().optional().describe('Whether the track is streamable'),
      downloadable: z.boolean().optional().describe('Whether the track is downloadable'),
      license: z.string().nullable().optional().describe('License type'),
      bpm: z.number().nullable().optional().describe('Beats per minute'),
      isrc: z.string().nullable().optional().describe('International Standard Recording Code'),
      createdAt: z.string().nullable().optional().describe('When the track was created'),
      lastModified: z
        .string()
        .nullable()
        .optional()
        .describe('When the track was last modified'),
      username: z.string().optional().describe('Username of the track uploader'),
      userId: z.string().optional().describe('User ID of the track uploader'),
      streams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Available stream URLs keyed by format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let track = await client.getTrack(ctx.input.trackId, ctx.input.secretToken);

    let streams: Record<string, string> | undefined;
    if (ctx.input.includeStreams) {
      if (track.access === 'blocked')
        throw fail(
          'This track is blocked for off-platform streaming. Request metadata without includeStreams.'
        );
      streams = await client.getTrackStreams(ctx.input.trackId, ctx.input.secretToken);
    }
    if (ctx.input.download) {
      const file = await downloadTrack(track, ctx.auth);
      await ctx.addAttachment({
        type: 'content',
        content: file.content,
        mimeType: file.mimeType,
        filename: file.fileName
      });
    }

    return {
      output: {
        trackId: track.urn,
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
        username: track.user?.username,
        userId: track.user?.urn,
        streams
      },
      message: `Retrieved track **"${track.title}"** by ${track.user?.username || 'unknown'} (${track.access}).`
    };
  })
  .build();
