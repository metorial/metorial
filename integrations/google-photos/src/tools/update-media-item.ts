import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateMediaItem = SlateTool.create(spec, {
  name: 'Update Media Item',
  key: 'update_media_item',
  description: `Update the description of a media item created by your app.`,
  constraints: [
    'Only media items created by the app can be updated.',
    'Only the description field can be changed.',
    'Descriptions have a maximum length of 1000 characters.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googlePhotosActionScopes.updateMediaItem)
  .input(
    z.object({
      mediaItemId: z.string().describe('The ID of the media item to update'),
      description: z
        .string()
        .max(1000)
        .describe('New description for the media item (max 1000 characters)')
    })
  )
  .output(
    z.object({
      mediaItemId: z.string().describe('ID of the updated media item'),
      description: z.string().optional().describe('Updated description'),
      filename: z.string().optional().describe('Filename of the media item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let item = await client.updateMediaItem(ctx.input.mediaItemId, ctx.input.description);

    return {
      output: {
        mediaItemId: item.id,
        description: item.description,
        filename: item.filename
      },
      message: `Updated description of media item **${item.filename || item.id}**.`
    };
  })
  .build();
