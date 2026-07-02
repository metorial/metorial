import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageAlbumMedia = SlateTool.create(spec, {
  name: 'Manage Album Media',
  key: 'manage_album_media',
  description: `Add or remove media items from an album. Use this to organize media items into albums created by your app.`,
  constraints: [
    'Only works with albums and media items created by the app.',
    'Up to 50 media items can be added or removed in a single call.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googlePhotosActionScopes.manageAlbumMedia)
  .input(
    z.object({
      albumId: z.string().describe('The ID of the album to manage'),
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove media items from the album'),
      mediaItemIds: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe('List of media item IDs to add or remove (max 50)')
    })
  )
  .output(
    z.object({
      albumId: z.string().describe('The album that was modified'),
      action: z.string().describe('The action that was performed'),
      mediaItemCount: z.number().describe('Number of media items affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    if (ctx.input.action === 'add') {
      await client.addMediaItemsToAlbum(ctx.input.albumId, ctx.input.mediaItemIds);
    } else {
      await client.removeMediaItemsFromAlbum(ctx.input.albumId, ctx.input.mediaItemIds);
    }

    let actionVerb = ctx.input.action === 'add' ? 'Added' : 'Removed';

    return {
      output: {
        albumId: ctx.input.albumId,
        action: ctx.input.action,
        mediaItemCount: ctx.input.mediaItemIds.length
      },
      message: `${actionVerb} **${ctx.input.mediaItemIds.length}** media item(s) ${ctx.input.action === 'add' ? 'to' : 'from'} album.`
    };
  })
  .build();
