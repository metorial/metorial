import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let bestPodcasts = SlateTool.create(spec, {
  name: 'Best Podcasts',
  key: 'best_podcasts',
  description: `Browse the best and most popular podcasts by genre. Returns curated lists of top podcasts with pagination support.
Filter by genre, region, publisher region, language, and sort order. Use the "Get Genres & Regions" tool to discover available genre IDs and region codes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      genreId: z
        .string()
        .optional()
        .describe('Genre ID to filter by. Omit for overall best podcasts.'),
      page: z.number().optional().describe('Page number for pagination.'),
      region: z
        .string()
        .optional()
        .describe('Country code for regional rankings (e.g., "us", "gb"). Defaults to "us".'),
      publisherRegion: z.string().optional().describe('Filter by publisher country code.'),
      language: z.string().optional().describe('Filter by podcast language.'),
      sort: z
        .enum([
          'recent_added_first',
          'oldest_added_first',
          'recent_published_first',
          'oldest_published_first',
          'listen_score'
        ])
        .optional()
        .describe('Sort order for results.'),
      safeMode: z.boolean().optional().describe('Set to true to exclude explicit content.')
    })
  )
  .output(
    z.object({
      genreName: z.string().describe('Name of the genre being browsed.'),
      genreId: z.number().describe('Genre ID.'),
      parentId: z.number().describe('Parent genre ID.'),
      listennotesUrl: z.string().describe('Listen Notes URL for this genre list.'),
      total: z.number().describe('Total number of podcasts in this genre.'),
      pageNumber: z.number().describe('Current page number.'),
      hasNext: z.boolean().describe('Whether there is a next page.'),
      hasPrevious: z.boolean().describe('Whether there is a previous page.'),
      nextPageNumber: z.number().describe('Next page number.'),
      previousPageNumber: z.number().describe('Previous page number.'),
      podcasts: z.array(z.any()).describe('Array of podcast objects.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.getBestPodcasts({
      genreId: ctx.input.genreId,
      page: ctx.input.page,
      region: ctx.input.region,
      publisherRegion: ctx.input.publisherRegion,
      language: ctx.input.language,
      sort: ctx.input.sort,
      safeMode: ctx.input.safeMode ? 1 : undefined
    });

    return {
      output: {
        genreName: data.name,
        genreId: data.id,
        parentId: data.parent_id,
        listennotesUrl: data.listennotes_url,
        total: data.total,
        pageNumber: data.page_number,
        hasNext: data.has_next,
        hasPrevious: data.has_previous,
        nextPageNumber: data.next_page_number,
        previousPageNumber: data.previous_page_number,
        podcasts: data.podcasts
      },
      message: `Showing **${data.podcasts.length}** best podcasts for "${data.name}" (page ${data.page_number}, ${data.total} total).`
    };
  })
  .build();
