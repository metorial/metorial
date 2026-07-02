import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

export let recentlyPlayedTrigger = SlateTrigger.create(spec, {
  name: 'Recently Played Track',
  key: 'recently_played_track',
  description:
    'Triggers when the user plays a track on Spotify. Polls for newly played tracks since the last check.'
})
  .input(
    z.object({
      playedAt: z.string().describe('ISO timestamp when the track was played'),
      trackId: z.string().describe('Spotify track ID'),
      trackName: z.string().describe('Track name'),
      trackUri: z.string().describe('Spotify track URI'),
      durationMs: z.number().describe('Track duration in milliseconds'),
      explicit: z.boolean().describe('Whether the track is explicit'),
      artists: z
        .array(
          z.object({
            artistId: z.string(),
            name: z.string()
          })
        )
        .describe('Track artists'),
      albumId: z.string().describe('Album ID'),
      albumName: z.string().describe('Album name'),
      spotifyUrl: z.string().describe('Spotify URL for the track'),
      contextType: z
        .string()
        .nullable()
        .describe('Context type (playlist, album, artist, etc.)'),
      contextUri: z.string().nullable().describe('Context URI')
    })
  )
  .output(
    z.object({
      trackId: z.string().describe('Spotify track ID'),
      trackName: z.string().describe('Track name'),
      trackUri: z.string().describe('Spotify track URI'),
      durationMs: z.number().describe('Track duration in milliseconds'),
      explicit: z.boolean().describe('Whether the track is explicit'),
      artists: z
        .array(
          z.object({
            artistId: z.string(),
            name: z.string()
          })
        )
        .describe('Track artists'),
      albumId: z.string().describe('Album ID'),
      albumName: z.string().describe('Album name'),
      playedAt: z.string().describe('ISO timestamp when the track was played'),
      spotifyUrl: z.string().describe('Spotify URL for the track'),
      contextType: z
        .string()
        .nullable()
        .describe('Context type (playlist, album, artist, etc.)'),
      contextUri: z.string().nullable().describe('Context URI')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SpotifyClient({
        token: ctx.auth.token,
        market: ctx.config.market
      });

      let params: { limit?: number; after?: string } = { limit: 50 };
      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      if (lastPolledAt) {
        params.after = lastPolledAt;
      }

      let result = await client.getRecentlyPlayed(params);

      let inputs = result.items.map(item => ({
        playedAt: item.played_at,
        trackId: item.track.id,
        trackName: item.track.name,
        trackUri: item.track.uri,
        durationMs: item.track.duration_ms,
        explicit: item.track.explicit,
        artists: item.track.artists.map(a => ({ artistId: a.id, name: a.name })),
        albumId: item.track.album.id,
        albumName: item.track.album.name,
        spotifyUrl: item.track.external_urls.spotify,
        contextType: item.context?.type ?? null,
        contextUri: item.context?.uri ?? null
      }));

      let newCursor = result.cursors?.after ?? lastPolledAt;

      return {
        inputs,
        updatedState: {
          lastPolledAt: newCursor ?? null
        }
      };
    },

    handleEvent: async ctx => {
      let playedAtMs = new Date(ctx.input.playedAt).getTime();
      let dedupId = `${ctx.input.trackId}-${playedAtMs}`;

      return {
        type: 'track.played',
        id: dedupId,
        output: {
          trackId: ctx.input.trackId,
          trackName: ctx.input.trackName,
          trackUri: ctx.input.trackUri,
          durationMs: ctx.input.durationMs,
          explicit: ctx.input.explicit,
          artists: ctx.input.artists,
          albumId: ctx.input.albumId,
          albumName: ctx.input.albumName,
          playedAt: ctx.input.playedAt,
          spotifyUrl: ctx.input.spotifyUrl,
          contextType: ctx.input.contextType,
          contextUri: ctx.input.contextUri
        }
      };
    }
  });
