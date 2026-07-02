import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let createAlbum = SlateTool.create(spec, {
  name: 'Create Album',
  key: 'create_album',
  description: `Create a new album in the user's Google Photos library. The album will be owned by your app and can be managed through the API.`,
  constraints: ['Album titles have a maximum length of 500 characters.'],
  tags: {
    destructive: false
  }
})
  .scopes(googlePhotosActionScopes.createAlbum)
  .input(
    z.object({
      title: z.string().max(500).describe('Title for the new album (max 500 characters)')
    })
  )
  .output(
    z.object({
      albumId: z.string().describe('Unique identifier for the created album'),
      title: z.string().describe('Title of the created album'),
      productUrl: z.string().optional().describe('Google Photos URL for the album'),
      isWriteable: z.boolean().optional().describe('Whether the app can write to this album')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let album = await client.createAlbum(ctx.input.title);

    return {
      output: {
        albumId: album.id,
        title: album.title,
        productUrl: album.productUrl,
        isWriteable: album.isWriteable
      },
      message: `Created album **"${album.title}"** (ID: ${album.id}).`
    };
  })
  .build();
