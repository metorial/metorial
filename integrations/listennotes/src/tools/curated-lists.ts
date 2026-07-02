import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let curatedLists = SlateTool.create(spec, {
  name: 'Browse Curated Lists',
  key: 'curated_lists',
  description: `Browse and fetch curated podcast lists. Without a curatedListId, returns a paginated list of available curated collections.
With a curatedListId, returns the full details and podcasts in that specific curated list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      curatedListId: z
        .string()
        .optional()
        .describe(
          'Specific curated list ID to fetch full details for. If omitted, returns a paginated index of curated lists.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Page number when browsing the curated lists index (not used when fetching a specific list).'
        )
    })
  )
  .output(
    z.object({
      curatedListId: z
        .string()
        .optional()
        .describe('Curated list ID (when fetching a specific list).'),
      title: z.string().optional().describe('List title (when fetching a specific list).'),
      description: z
        .string()
        .optional()
        .describe('List description (when fetching a specific list).'),
      sourceUrl: z
        .string()
        .optional()
        .describe('Original source URL (when fetching a specific list).'),
      listennotesUrl: z
        .string()
        .optional()
        .describe('Listen Notes URL (when fetching a specific list).'),
      total: z.number().describe('Total number of items.'),
      podcasts: z
        .array(z.any())
        .optional()
        .describe('Podcasts in the curated list (when fetching a specific list).'),
      curatedLists: z
        .array(
          z.object({
            curatedListId: z.string().describe('Curated list ID.'),
            title: z.string().describe('List title.'),
            description: z.string().describe('List description.'),
            sourceUrl: z.string().describe('Source URL.'),
            sourceDomain: z.string().describe('Source domain.'),
            listennotesUrl: z.string().describe('Listen Notes URL.'),
            total: z.number().describe('Number of podcasts in the list.')
          })
        )
        .optional()
        .describe('Array of curated lists (when browsing the index).'),
      pageNumber: z
        .number()
        .optional()
        .describe('Current page number (when browsing the index).'),
      hasNext: z
        .boolean()
        .optional()
        .describe('Whether there is a next page (when browsing the index).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.curatedListId) {
      let data = await client.getCuratedPodcast(ctx.input.curatedListId);

      return {
        output: {
          curatedListId: data.id,
          title: data.title,
          description: data.description,
          sourceUrl: data.source_url,
          listennotesUrl: data.listennotes_url,
          total: data.total,
          podcasts: data.podcasts
        },
        message: `Fetched curated list **${data.title}** with ${data.total} podcasts.`
      };
    } else {
      let data = await client.getCuratedPodcasts({ page: ctx.input.page });

      return {
        output: {
          total: data.total,
          curatedLists: data.curated_lists.map(list => ({
            curatedListId: list.id,
            title: list.title,
            description: list.description,
            sourceUrl: list.source_url,
            sourceDomain: list.source_domain,
            listennotesUrl: list.listennotes_url,
            total: list.total
          })),
          pageNumber: data.page_number,
          hasNext: data.has_next
        },
        message: `Found **${data.total}** curated lists (page ${data.page_number}).`
      };
    }
  })
  .build();
