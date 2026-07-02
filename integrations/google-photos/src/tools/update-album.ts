import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateAlbum = SlateTool.create(spec, {
  name: 'Update Album',
  key: 'update_album',
  description: `Update the title or cover photo of an album created by your app. Provide the album ID and the fields you want to change.`,
  constraints: [
    'Only albums created by the app can be updated.',
    'Only the title and cover photo can be changed.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googlePhotosActionScopes.updateAlbum)
  .input(
    z.object({
      albumId: z.string().describe('The ID of the album to update'),
      title: z
        .string()
        .max(500)
        .optional()
        .describe('New title for the album (max 500 characters)'),
      coverPhotoMediaItemId: z
        .string()
        .optional()
        .describe('Media item ID to set as the album cover photo')
    })
  )
  .output(
    z.object({
      albumId: z.string().describe('Unique identifier for the album'),
      title: z.string().describe('Updated title of the album'),
      productUrl: z.string().optional().describe('Google Photos URL for the album'),
      coverPhotoMediaItemId: z.string().optional().describe('Media item ID of the cover photo')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let album = await client.updateAlbum(ctx.input.albumId, {
      title: ctx.input.title,
      coverPhotoMediaItemId: ctx.input.coverPhotoMediaItemId
    });

    let changes: string[] = [];
    if (ctx.input.title) changes.push(`title to "${ctx.input.title}"`);
    if (ctx.input.coverPhotoMediaItemId) changes.push('cover photo');

    return {
      output: {
        albumId: album.id,
        title: album.title,
        productUrl: album.productUrl,
        coverPhotoMediaItemId: album.coverPhotoMediaItemId
      },
      message: `Updated album **"${album.title}"**: changed ${changes.join(' and ')}.`
    };
  })
  .build();
