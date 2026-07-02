import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchFetch = SlateTool.create(spec, {
  name: 'Batch Fetch Podcasts or Episodes',
  key: 'batch_fetch',
  description: `Fetch metadata for multiple podcasts or episodes in a single request (up to 10).
For podcasts, you can look them up by Listen Notes IDs, RSS URLs, iTunes IDs, or Spotify IDs.
For episodes, provide Listen Notes episode IDs. Requires PRO/ENTERPRISE plan.`,
  instructions: [
    'Provide comma-separated values for the ID fields.',
    'For podcasts, you can mix different ID types in a single request.',
    'Set showLatestEpisodes to true to include up to 10 latest episodes per podcast.'
  ],
  constraints: ['Maximum of 10 items per batch request.', 'Requires PRO or ENTERPRISE plan.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['podcast', 'episode'])
        .describe('Whether to batch fetch podcasts or episodes.'),
      podcastIds: z
        .string()
        .optional()
        .describe('Comma-separated Listen Notes podcast IDs (podcasts only).'),
      rssUrls: z
        .string()
        .optional()
        .describe('Comma-separated RSS feed URLs (podcasts only).'),
      itunesIds: z.string().optional().describe('Comma-separated iTunes IDs (podcasts only).'),
      spotifyIds: z
        .string()
        .optional()
        .describe('Comma-separated Spotify IDs (podcasts only).'),
      showLatestEpisodes: z
        .boolean()
        .optional()
        .describe('Include latest episodes for each podcast (podcasts only).'),
      episodeIds: z
        .string()
        .optional()
        .describe('Comma-separated Listen Notes episode IDs (episodes only).')
    })
  )
  .output(
    z.object({
      podcasts: z.array(z.any()).optional().describe('Array of podcast metadata objects.'),
      episodes: z.array(z.any()).optional().describe('Array of episode metadata objects.'),
      latestEpisodes: z
        .array(z.any())
        .optional()
        .describe('Latest episodes for the fetched podcasts.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.resourceType === 'podcast') {
      let data = await client.batchFetchPodcasts({
        ids: ctx.input.podcastIds,
        rsses: ctx.input.rssUrls,
        itunesIds: ctx.input.itunesIds,
        spotifyIds: ctx.input.spotifyIds,
        showLatestEpisodes: ctx.input.showLatestEpisodes ? 1 : undefined
      });

      return {
        output: {
          podcasts: data.podcasts,
          latestEpisodes: data.latest_episodes
        },
        message: `Fetched **${data.podcasts.length}** podcast(s).`
      };
    } else {
      let data = await client.batchFetchEpisodes(ctx.input.episodeIds || '');

      return {
        output: {
          episodes: data.episodes
        },
        message: `Fetched **${data.episodes.length}** episode(s).`
      };
    }
  })
  .build();
