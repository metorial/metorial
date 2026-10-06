import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import type { SpotifyAudioFeatures } from '../lib/types';
import { spec } from '../spec';

export let getTrack = SlateTool.create(spec, {
  name: 'Get Track',
  key: 'get_track',
  description: `Retrieve detailed information about one or more tracks including metadata, audio features (danceability, energy, tempo, etc.), and album info. Accepts up to 50 track IDs. Current endpoint mode reads each exact track separately; a failed read reports the count already read, without writes.`,
  constraints: [
    'Audio features may not be available for all tracks or for new applications without extended quota mode.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      trackIds: z.array(z.string()).min(1).max(50).describe('One or more Spotify track IDs'),
      includeAudioFeatures: z
        .boolean()
        .optional()
        .describe('Whether to include audio features (danceability, energy, tempo, etc.)'),
      market: z.string().optional().describe('ISO 3166-1 alpha-2 country code')
    })
  )
  .output(
    z.object({
      unavailableTrackIds: z.array(z.string()).optional(),
      tracks: z.array(
        z.object({
          trackId: z.string(),
          name: z.string(),
          durationMs: z.number(),
          explicit: z.boolean(),
          popularity: z.number().optional(),
          trackNumber: z.number(),
          discNumber: z.number(),
          isLocal: z.boolean().optional(),
          artists: z.array(
            z.object({
              artistId: z.string(),
              name: z.string()
            })
          ),
          album: z.object({
            albumId: z.string(),
            name: z.string(),
            releaseDate: z.string(),
            imageUrl: z.string().nullable()
          }),
          spotifyUrl: z.string(),
          previewUrl: z.string().nullable().optional(),
          uri: z.string(),
          audioFeatures: z
            .object({
              danceability: z.number(),
              energy: z.number(),
              key: z.number(),
              loudness: z.number(),
              mode: z.number(),
              speechiness: z.number(),
              acousticness: z.number(),
              instrumentalness: z.number(),
              liveness: z.number(),
              valence: z.number(),
              tempo: z.number(),
              timeSignature: z.number()
            })
            .optional()
        })
      )
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

    if (ctx.input.includeAudioFeatures) client.requireLegacy('Audio features');
    let tracksData =
      ctx.input.trackIds.length === 1
        ? [await client.getTrack(ctx.input.trackIds[0]!, ctx.input.market)]
        : (await client.getSeveralTracks(ctx.input.trackIds, ctx.input.market)).tracks;
    const audioFeaturesMap = new Map<string, SpotifyAudioFeatures>();
    if (ctx.input.includeAudioFeatures) {
      const features =
        ctx.input.trackIds.length === 1
          ? [await client.getAudioFeatures(ctx.input.trackIds[0]!)]
          : (await client.getSeveralAudioFeatures(ctx.input.trackIds)).audio_features;
      for (const feature of features) if (feature) audioFeaturesMap.set(feature.id, feature);
    }
    let tracks = tracksData
      .filter(t => t !== null)
      .map(t => {
        let features = audioFeaturesMap.get(t.id);
        return {
          trackId: t.id,
          name: t.name,
          durationMs: t.duration_ms,
          explicit: t.explicit,
          popularity: t.popularity,
          trackNumber: t.track_number,
          discNumber: t.disc_number,
          isLocal: t.is_local,
          artists: t.artists.map(a => ({ artistId: a.id, name: a.name })),
          album: {
            albumId: t.album.id,
            name: t.album.name,
            releaseDate: t.album.release_date,
            imageUrl: t.album.images?.[0]?.url ?? null
          },
          spotifyUrl: t.external_urls.spotify,
          previewUrl: t.preview_url,
          uri: t.uri,
          ...(features
            ? {
                audioFeatures: {
                  danceability: features.danceability,
                  energy: features.energy,
                  key: features.key,
                  loudness: features.loudness,
                  mode: features.mode,
                  speechiness: features.speechiness,
                  acousticness: features.acousticness,
                  instrumentalness: features.instrumentalness,
                  liveness: features.liveness,
                  valence: features.valence,
                  tempo: features.tempo,
                  timeSignature: features.time_signature
                }
              }
            : {})
        };
      });

    return {
      output: {
        tracks,
        unavailableTrackIds: ctx.input.trackIds.filter((_, i) => tracksData[i] === null)
      },
      message: `Retrieved ${tracks.length} track(s): ${tracks.map(t => `**${t.name}** by ${t.artists.map(a => a.name).join(', ')}`).join('; ')}.`
    };
  });
