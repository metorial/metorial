import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpotifyClient } from '../lib/client';
import { spec } from '../spec';

export let getTopItems = SlateTool.create(spec, {
  name: 'Get Top Items',
  key: 'get_top_items',
  description: `Retrieve the current user's most listened-to artists or tracks based on calculated affinity. Supports three time ranges: short-term (last 4 weeks), medium-term (last 6 months), and long-term (several years of data).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.enum(['artists', 'tracks']).describe('Whether to get top artists or tracks'),
      timeRange: z
        .enum(['short_term', 'medium_term', 'long_term'])
        .optional()
        .describe(
          'Time range: short_term (4 weeks), medium_term (6 months), long_term (several years). Defaults to medium_term.'
        ),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Max number of items to return (default 20, max 50)'),
      offset: z.number().min(0).optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      topArtists: z
        .array(
          z.object({
            artistId: z.string(),
            name: z.string(),
            genres: z.array(z.string()),
            popularity: z.number(),
            followers: z.number(),
            imageUrl: z.string().nullable(),
            spotifyUrl: z.string(),
            uri: z.string()
          })
        )
        .optional(),
      topTracks: z
        .array(
          z.object({
            trackId: z.string(),
            name: z.string(),
            durationMs: z.number(),
            popularity: z.number(),
            explicit: z.boolean(),
            artists: z.array(
              z.object({
                artistId: z.string(),
                name: z.string()
              })
            ),
            albumName: z.string(),
            spotifyUrl: z.string(),
            uri: z.string()
          })
        )
        .optional(),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpotifyClient({
      token: ctx.auth.token,
      market: ctx.config.market
    });

    let result = await client.getTopItems(ctx.input.type, {
      timeRange: ctx.input.timeRange,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let topArtists =
      ctx.input.type === 'artists'
        ? result.items.map((item: any) => ({
            artistId: item.id,
            name: item.name,
            genres: item.genres,
            popularity: item.popularity,
            followers: item.followers.total,
            imageUrl: item.images?.[0]?.url ?? null,
            spotifyUrl: item.external_urls.spotify,
            uri: item.uri
          }))
        : undefined;

    let topTracks =
      ctx.input.type === 'tracks'
        ? result.items.map((item: any) => ({
            trackId: item.id,
            name: item.name,
            durationMs: item.duration_ms,
            popularity: item.popularity,
            explicit: item.explicit,
            artists: item.artists.map((a: any) => ({ artistId: a.id, name: a.name })),
            albumName: item.album.name,
            spotifyUrl: item.external_urls.spotify,
            uri: item.uri
          }))
        : undefined;

    let timeLabel =
      ctx.input.timeRange === 'short_term'
        ? '4 weeks'
        : ctx.input.timeRange === 'long_term'
          ? 'all time'
          : '6 months';
    let itemCount = (topArtists ?? topTracks ?? []).length;
    return {
      output: {
        topArtists,
        topTracks,
        total: result.total
      },
      message: `Retrieved top ${itemCount} ${ctx.input.type} (${timeLabel}).`
    };
  });
