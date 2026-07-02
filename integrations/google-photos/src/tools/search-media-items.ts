import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

let dateSchema = z.object({
  year: z.number().optional().describe('Year (e.g. 2024). Use 0 to match any year.'),
  month: z
    .number()
    .min(0)
    .max(12)
    .optional()
    .describe('Month (1-12). Use 0 to match any month.'),
  day: z
    .number()
    .min(0)
    .max(31)
    .optional()
    .describe('Day of month (1-31). Use 0 to match any day.')
});

export let searchMediaItems = SlateTool.create(spec, {
  name: 'Search Media Items',
  key: 'search_media_items',
  description: `Search and list media items created by your app. Filter by album, date range, content category, media type, or favorites. Can also list all app-created media items without filters.`,
  instructions: [
    'To list all media items, omit all filter parameters.',
    'Album ID filter cannot be combined with other filters.',
    'Use content categories like LANDSCAPES, SELFIES, ANIMALS, FOOD, etc.',
    'Set orderBy to "MediaMetadata.creation_time" or "MediaMetadata.creation_time desc" when using date filters.'
  ],
  constraints: [
    'Maximum page size is 100.',
    'Only media items created by the app are returned.',
    'Album filter and other filters are mutually exclusive.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googlePhotosActionScopes.searchMediaItems)
  .input(
    z.object({
      albumId: z
        .string()
        .optional()
        .describe('Filter by album ID (cannot be used with other filters)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum results to return (1-100, default 25)'),
      pageToken: z.string().optional().describe('Pagination token from a previous request'),
      dateRanges: z
        .array(
          z.object({
            startDate: dateSchema.describe('Start date of the range'),
            endDate: dateSchema.describe('End date of the range')
          })
        )
        .max(5)
        .optional()
        .describe('Filter by date ranges (max 5)'),
      contentCategories: z
        .array(
          z.enum([
            'NONE',
            'LANDSCAPES',
            'RECEIPTS',
            'CITYSCAPES',
            'LANDMARKS',
            'SELFIES',
            'PEOPLE',
            'PETS',
            'WEDDINGS',
            'BIRTHDAYS',
            'DOCUMENTS',
            'TRAVEL',
            'ANIMALS',
            'FOOD',
            'SPORT',
            'NIGHT',
            'PERFORMANCES',
            'WHITEBOARDS',
            'SCREENSHOTS',
            'UTILITY',
            'ARTS',
            'CRAFTS',
            'FASHION',
            'HOUSES',
            'GARDENS',
            'FLOWERS',
            'HOLIDAYS'
          ])
        )
        .optional()
        .describe('Filter by content categories'),
      mediaTypes: z
        .array(z.enum(['ALL_MEDIA', 'VIDEO', 'PHOTO']))
        .optional()
        .describe('Filter by media type'),
      onlyFavorites: z.boolean().optional().describe('If true, only return favorited items'),
      orderBy: z
        .enum(['MediaMetadata.creation_time', 'MediaMetadata.creation_time desc'])
        .optional()
        .describe('Sort order (only works with date filters)')
    })
  )
  .output(
    z.object({
      mediaItems: z.array(
        z.object({
          mediaItemId: z.string().describe('Unique identifier for the media item'),
          description: z.string().optional().describe('User-provided description'),
          productUrl: z.string().optional().describe('Google Photos URL'),
          baseUrl: z.string().optional().describe('Base URL for accessing media bytes'),
          mimeType: z.string().optional().describe('MIME type'),
          filename: z.string().optional().describe('Original filename'),
          creationTime: z.string().optional().describe('Creation time (RFC 3339)'),
          width: z.string().optional().describe('Width in pixels'),
          height: z.string().optional().describe('Height in pixels')
        })
      ),
      nextPageToken: z.string().optional().describe('Token to retrieve the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let searchParams: Record<string, any> = {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    };

    if (ctx.input.albumId) {
      searchParams.albumId = ctx.input.albumId;
    } else {
      let filters: Record<string, any> = {};

      if (ctx.input.dateRanges && ctx.input.dateRanges.length > 0) {
        filters.dateFilter = {
          ranges: ctx.input.dateRanges
        };
      }

      if (ctx.input.contentCategories && ctx.input.contentCategories.length > 0) {
        filters.contentFilter = {
          includedContentCategories: ctx.input.contentCategories
        };
      }

      if (ctx.input.mediaTypes && ctx.input.mediaTypes.length > 0) {
        filters.mediaTypeFilter = {
          mediaTypes: ctx.input.mediaTypes
        };
      }

      if (ctx.input.onlyFavorites) {
        filters.featureFilter = {
          includedFeatures: ['FAVORITES']
        };
      }

      if (Object.keys(filters).length > 0) {
        searchParams.filters = filters;
      }

      if (ctx.input.orderBy) {
        searchParams.orderBy = ctx.input.orderBy;
      }
    }

    let result = await client.searchMediaItems(searchParams);

    let mediaItems = result.mediaItems.map(item => ({
      mediaItemId: item.id,
      description: item.description,
      productUrl: item.productUrl,
      baseUrl: item.baseUrl,
      mimeType: item.mimeType,
      filename: item.filename,
      creationTime: item.mediaMetadata?.creationTime,
      width: item.mediaMetadata?.width,
      height: item.mediaMetadata?.height
    }));

    return {
      output: {
        mediaItems,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${mediaItems.length}** media item(s).${result.nextPageToken ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
