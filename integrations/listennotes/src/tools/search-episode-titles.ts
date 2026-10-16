import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const searchEpisodeTitles = SlateTool.create(spec, {
  key: 'search_episode_titles',
  name: 'Search Episode Titles',
  description:
    'Find episodes by title, optionally restricted to a podcast identified by Listen Notes ID, Apple Podcasts ID, Spotify ID, or RSS URL. Useful for matching episodes imported from another platform.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z.string().describe('Episode title. Wrap in double quotes for an exact match.'),
      podcastId: z
        .string()
        .optional()
        .describe('Optional podcast identifier, interpreted according to podcastIdType.'),
      podcastIdType: z
        .enum(['listennotes_id', 'itunes_id', 'spotify_id', 'rss'])
        .optional()
        .describe('Podcast identifier format. Defaults to listennotes_id.')
    })
  )
  .output(
    z.object({
      took: z.number(),
      count: z.number(),
      total: z.number(),
      nextOffset: z.number(),
      results: z.array(z.unknown()),
      raw: z
        .unknown()
        .describe('Complete search response, including original episode metadata.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.query.trim())
      throw createApiServiceError('Provide an episode title to search for.');
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let data = await client.searchEpisodeTitles({
      q: ctx.input.query,
      podcastId: ctx.input.podcastId,
      podcastIdType: ctx.input.podcastIdType
    });
    return {
      output: {
        took: data.took,
        count: data.count,
        total: data.total,
        nextOffset: data.next_offset,
        results: data.results,
        raw: data
      },
      message: `Found **${data.total}** title matches.`
    };
  })
  .build();
