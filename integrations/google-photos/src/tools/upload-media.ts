import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Create media items in the user's Google Photos library from previously obtained upload tokens. Each item requires an upload token (from the bytes upload step), a filename, and optionally a description. Items can be added to an album at creation time.`,
  instructions: [
    'Upload tokens are obtained by first uploading the raw bytes via the Google Photos upload endpoint.',
    'Up to 50 media items can be created in a single batch.'
  ],
  constraints: [
    'Maximum of 50 media items per batch.',
    'Upload tokens must be obtained prior to calling this tool.',
    'The maximum upload file size for a photo is 200 MB.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googlePhotosActionScopes.uploadMedia)
  .input(
    z.object({
      items: z
        .array(
          z.object({
            uploadToken: z
              .string()
              .describe('Upload token obtained from the bytes upload step'),
            fileName: z.string().describe('Filename for the media item (e.g. "vacation.jpg")'),
            description: z
              .string()
              .max(1000)
              .optional()
              .describe('Description for the media item')
          })
        )
        .min(1)
        .max(50)
        .describe('Media items to create (max 50)'),
      albumId: z.string().optional().describe('Optional album ID to add the created items to')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          uploadToken: z.string().describe('The upload token that was used'),
          status: z.string().describe('Status message (e.g. "Success")'),
          mediaItemId: z.string().optional().describe('ID of the created media item'),
          productUrl: z.string().optional().describe('Google Photos URL for the media item')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let result = await client.createMediaItems(ctx.input.items, ctx.input.albumId);

    let results = result.newMediaItemResults.map(r => ({
      uploadToken: r.uploadToken,
      status: r.status.message,
      mediaItemId: r.mediaItem?.id,
      productUrl: r.mediaItem?.productUrl
    }));

    let successCount = results.filter(r => r.mediaItemId).length;

    return {
      output: { results },
      message: `Created **${successCount}** of ${results.length} media item(s).${ctx.input.albumId ? ' Added to album.' : ''}`
    };
  })
  .build();
