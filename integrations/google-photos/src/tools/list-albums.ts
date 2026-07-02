import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let listAlbums = SlateTool.create(spec, {
  name: 'List Albums',
  key: 'list_albums',
  description: `List albums created by your app in the user's Google Photos library. Returns album details including title, item count, and cover photo URL. Supports pagination for large collections.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googlePhotosActionScopes.listAlbums)
  .input(
    z.object({
      pageSize: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of albums to return (1-50, default 20)'),
      pageToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous request to retrieve the next page'),
      excludeNonAppCreatedData: z
        .boolean()
        .optional()
        .describe('If true, only return albums created by this app')
    })
  )
  .output(
    z.object({
      albums: z.array(
        z.object({
          albumId: z.string().describe('Unique identifier for the album'),
          title: z.string().describe('Title of the album'),
          productUrl: z.string().optional().describe('Google Photos URL for the album'),
          isWriteable: z
            .boolean()
            .optional()
            .describe('Whether the app can write to this album'),
          mediaItemsCount: z
            .string()
            .optional()
            .describe('Number of media items in the album'),
          coverPhotoBaseUrl: z
            .string()
            .optional()
            .describe('Base URL for the album cover photo'),
          coverPhotoMediaItemId: z
            .string()
            .optional()
            .describe('Media item ID of the cover photo')
        })
      ),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token to retrieve the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let result = await client.listAlbums({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken,
      excludeNonAppCreatedData: ctx.input.excludeNonAppCreatedData
    });

    let albums = result.albums.map(album => ({
      albumId: album.id,
      title: album.title,
      productUrl: album.productUrl,
      isWriteable: album.isWriteable,
      mediaItemsCount: album.mediaItemsCount,
      coverPhotoBaseUrl: album.coverPhotoBaseUrl,
      coverPhotoMediaItemId: album.coverPhotoMediaItemId
    }));

    return {
      output: {
        albums,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${albums.length}** album(s).${result.nextPageToken ? ' More albums available with pagination.' : ''}`
    };
  })
  .build();
