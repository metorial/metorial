import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleMapsSearch = SlateTool.create(spec, {
  name: 'Google Maps Search',
  key: 'google_maps_search',
  description: `Search Google Maps for places, businesses, and points of interest. Returns location data including addresses, ratings, reviews links, photos links, and more. Also supports fetching reviews, photos, and posts for a specific place using its data ID.`,
  instructions: [
    'The `coordinates` parameter should be in the format "@latitude,longitude,zoom" (e.g., "@40.7455096,-74.0083012,15.1z").',
    'To get reviews, photos, or posts for a place, first search for it to get the `dataId`, then pass it along with the desired `retrieve` option.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('The search query for places or businesses'),
      coordinates: z
        .string()
        .optional()
        .describe(
          'GPS coordinates in format "@latitude,longitude,zoom" (e.g., "@40.7455096,-74.0083012,15.1z")'
        ),
      language: z
        .string()
        .optional()
        .describe('Language of results (e.g., "en_us"). Defaults to "en_us".'),
      page: z.number().optional().describe('Page offset (0, 10, 20, etc.)'),
      googleDomain: z
        .string()
        .optional()
        .describe('Google domain (e.g., "google.co.in"). Defaults to "google.com".'),
      dataId: z
        .string()
        .optional()
        .describe(
          'Google Maps data ID for fetching reviews, photos, or posts for a specific place'
        ),
      retrieve: z
        .enum(['search', 'reviews', 'photos', 'posts'])
        .optional()
        .describe(
          'What to retrieve. Defaults to "search". Use "reviews", "photos", or "posts" with a dataId.'
        ),
      reviewSortBy: z
        .enum(['qualityScore', 'newestFirst', 'ratingHigh', 'ratingLow'])
        .optional()
        .describe('Sort order for reviews'),
      reviewTopicId: z.string().optional().describe('Filter reviews by topic ID'),
      photoCategoryId: z.string().optional().describe('Filter photos by category ID'),
      nextPageToken: z.string().optional().describe('Pagination token for reviews or photos')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Google Maps results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let retrieve = ctx.input.retrieve || 'search';

    let data: any;
    let message: string;

    switch (retrieve) {
      case 'reviews':
        if (!ctx.input.dataId) throw new Error('dataId is required for fetching reviews');
        data = await client.googleMapsReviews({
          dataId: ctx.input.dataId,
          hl: ctx.input.language,
          sortBy: ctx.input.reviewSortBy,
          topicId: ctx.input.reviewTopicId,
          nextPageToken: ctx.input.nextPageToken
        });
        message = `Fetched Google Maps reviews for place **${ctx.input.dataId}**.`;
        break;

      case 'photos':
        if (!ctx.input.dataId) throw new Error('dataId is required for fetching photos');
        data = await client.googleMapsPhotos({
          dataId: ctx.input.dataId,
          hl: ctx.input.language,
          categoryId: ctx.input.photoCategoryId,
          nextPageToken: ctx.input.nextPageToken
        });
        message = `Fetched Google Maps photos for place **${ctx.input.dataId}**.`;
        break;

      case 'posts':
        if (!ctx.input.dataId) throw new Error('dataId is required for fetching posts');
        data = await client.googleMapsPosts({
          dataId: ctx.input.dataId
        });
        message = `Fetched Google Maps posts for place **${ctx.input.dataId}**.`;
        break;

      default:
        if (!ctx.input.query) throw new Error('query is required for maps search');
        data = await client.googleMapsSearch({
          q: ctx.input.query,
          ll: ctx.input.coordinates,
          hl: ctx.input.language,
          page: ctx.input.page,
          domain: ctx.input.googleDomain
        });
        message = `Searched Google Maps for **"${ctx.input.query}"**.`;
        break;
    }

    return {
      output: { results: data },
      message
    };
  })
  .build();
