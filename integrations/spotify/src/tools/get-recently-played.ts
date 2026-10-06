import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { paging, pagingOutputSchema } from '../lib/types';
import { spec } from '../spec';

export let getRecentlyPlayed = SlateTool.create(spec, {
  name: 'Get Recently Played',
  key: 'get_recently_played',
  description: `Retrieve the user's recently played tracks with timestamps and context information (e.g., which playlist or album the track was played from). Returns up to 50 recent tracks.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Max number of items to return (default 20, max 50)'),
      after: z
        .string()
        .optional()
        .describe('Unix timestamp in milliseconds — return items played after this timestamp'),
      before: z
        .string()
        .optional()
        .describe('Unix timestamp in milliseconds — return items played before this timestamp')
    })
  )
  .output(
    z.object({
      paging: pagingOutputSchema,
      recentTracks: z.array(
        z.object({
          playedAt: z.string(),
          trackId: z.string(),
          name: z.string(),
          durationMs: z.number(),
          artists: z.array(
            z.object({
              artistId: z.string(),
              name: z.string()
            })
          ),
          albumName: z.string(),
          spotifyUrl: z.string(),
          uri: z.string(),
          contextType: z.string().nullable(),
          contextUri: z.string().nullable()
        })
      ),
      cursors: z
        .object({
          after: z.string().nullable(),
          before: z.string().nullable()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      refreshToken: ctx.auth.refreshToken,
      input: ctx.input,
      market: ctx.config.market,
      endpointCompatibility: ctx.config.endpointCompatibility
    });

    let result = await client.getRecentlyPlayed({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let recentTracks = result.items.map(item => ({
      playedAt: item.played_at,
      trackId: item.track.id,
      name: item.track.name,
      durationMs: item.track.duration_ms,
      artists: item.track.artists.map(a => ({ artistId: a.id, name: a.name })),
      albumName: item.track.album.name,
      spotifyUrl: item.track.external_urls.spotify,
      uri: item.track.uri,
      contextType: item.context?.type ?? null,
      contextUri: item.context?.uri ?? null
    }));

    return {
      output: {
        recentTracks,
        paging: paging(result),
        cursors: {
          after: result.cursors?.after ?? null,
          before: result.cursors?.before ?? null
        }
      },
      message: `Retrieved ${recentTracks.length} recently played track(s).`
    };
  });
