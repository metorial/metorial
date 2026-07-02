import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let getAlbum = SlateTool.create(spec, {
  name: 'Get Album',
  key: 'get_album',
  description: `Retrieve detailed information about a specific album by its ID, including title, media item count, cover photo, and writeability status.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googlePhotosActionScopes.getAlbum)
  .input(
    z.object({
      albumId: z.string().describe('The ID of the album to retrieve')
    })
  )
  .output(
    z.object({
      albumId: z.string().describe('Unique identifier for the album'),
      title: z.string().describe('Title of the album'),
      productUrl: z.string().optional().describe('Google Photos URL for the album'),
      isWriteable: z.boolean().optional().describe('Whether the app can write to this album'),
      mediaItemsCount: z.string().optional().describe('Number of media items in the album'),
      coverPhotoBaseUrl: z.string().optional().describe('Base URL for the album cover photo'),
      coverPhotoMediaItemId: z.string().optional().describe('Media item ID of the cover photo')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let album = await client.getAlbum(ctx.input.albumId);

    return {
      output: {
        albumId: album.id,
        title: album.title,
        productUrl: album.productUrl,
        isWriteable: album.isWriteable,
        mediaItemsCount: album.mediaItemsCount,
        coverPhotoBaseUrl: album.coverPhotoBaseUrl,
        coverPhotoMediaItemId: album.coverPhotoMediaItemId
      },
      message: `Retrieved album **"${album.title}"** with ${album.mediaItemsCount || '0'} items.`
    };
  })
  .build();
