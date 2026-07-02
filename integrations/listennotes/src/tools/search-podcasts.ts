import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPodcasts = SlateTool.create(spec, {
  name: 'Search Podcasts & Episodes',
  key: 'search_podcasts',
  description: `Full-text search across millions of podcasts, episodes, and curated lists.
Supports filtering by content type, genre, language, region, publish date range, and audio length.
Results include highlighted matches and relevance scoring. Use **type** to search podcasts, episodes, or curated lists.`,
  instructions: [
    'Use sortByDate=1 to get most recent results first, or 0 for relevance-based sorting.',
    'Use onlyIn to limit search to specific fields like "title", "description", or "author".',
    'Wrap query terms in double quotes for exact phrase matching.'
  ],
  constraints: [
    'Maximum offset depends on plan: 30 (Free), 300 (Pro), 10000 (Enterprise).',
    'Page size is 1-10 results per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Search query. Supports double quotes for exact phrase matching.'),
      type: z
        .enum(['episode', 'podcast', 'curated'])
        .optional()
        .describe('Type of content to search. Defaults to "episode".'),
      sortByDate: z
        .number()
        .optional()
        .describe('0 for relevance, 1 for date. Defaults to 0.'),
      offset: z.number().optional().describe('Pagination offset for results.'),
      lenMin: z
        .number()
        .optional()
        .describe('Minimum audio length in minutes (episodes only).'),
      lenMax: z
        .number()
        .optional()
        .describe('Maximum audio length in minutes (episodes only).'),
      episodeCountMin: z
        .number()
        .optional()
        .describe('Minimum number of episodes (podcasts only).'),
      episodeCountMax: z
        .number()
        .optional()
        .describe('Maximum number of episodes (podcasts only).'),
      genreIds: z.string().optional().describe('Comma-delimited genre IDs to filter by.'),
      publishedBefore: z
        .number()
        .optional()
        .describe('Only return results published before this Unix timestamp in milliseconds.'),
      publishedAfter: z
        .number()
        .optional()
        .describe('Only return results published after this Unix timestamp in milliseconds.'),
      onlyIn: z
        .string()
        .optional()
        .describe(
          'Comma-delimited list of fields to search in: title, description, author, audio.'
        ),
      language: z
        .string()
        .optional()
        .describe('Podcast language filter (e.g., "English", "Spanish").'),
      region: z.string().optional().describe('Country code filter (e.g., "us", "gb").'),
      includePodcastIds: z
        .string()
        .optional()
        .describe(
          'Comma-delimited podcast IDs to include results from (max 5, episodes only).'
        ),
      excludePodcastIds: z
        .string()
        .optional()
        .describe(
          'Comma-delimited podcast IDs to exclude results from (max 5, episodes only).'
        ),
      safeMode: z
        .number()
        .optional()
        .describe('1 to exclude explicit content, 0 to include. Defaults to 0.'),
      uniquePodcasts: z
        .number()
        .optional()
        .describe('1 to return max one episode per podcast (episodes only).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-10). Defaults to 10.')
    })
  )
  .output(
    z.object({
      took: z.number().describe('Search execution time in seconds.'),
      count: z.number().describe('Number of results on this page.'),
      total: z.number().describe('Total number of matching results.'),
      nextOffset: z.number().describe('Offset value for the next page of results.'),
      results: z
        .array(z.any())
        .describe('Array of search result objects (episodes, podcasts, or curated lists).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.search({
      q: ctx.input.query,
      type: ctx.input.type,
      sortByDate: ctx.input.sortByDate,
      offset: ctx.input.offset,
      lenMin: ctx.input.lenMin,
      lenMax: ctx.input.lenMax,
      episodeCountMin: ctx.input.episodeCountMin,
      episodeCountMax: ctx.input.episodeCountMax,
      genreIds: ctx.input.genreIds,
      publishedBefore: ctx.input.publishedBefore,
      publishedAfter: ctx.input.publishedAfter,
      onlyIn: ctx.input.onlyIn,
      language: ctx.input.language,
      region: ctx.input.region,
      ocid: ctx.input.includePodcastIds,
      ncid: ctx.input.excludePodcastIds,
      safeMode: ctx.input.safeMode,
      uniquePodcasts: ctx.input.uniquePodcasts,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        took: data.took,
        count: data.count,
        total: data.total,
        nextOffset: data.next_offset,
        results: data.results
      },
      message: `Found **${data.total}** results for "${ctx.input.query}" (showing ${data.count} on this page).`
    };
  })
  .build();
