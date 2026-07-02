import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosPickerClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let listPickedMedia = SlateTool.create(spec, {
  name: 'List Picked Media',
  key: 'list_picked_media',
  description: `Retrieve media items that the user selected during a Picker session. Returns access URLs, metadata, and file information for each picked item. The session must have **mediaItemsSet** set to true.`,
  constraints: [
    'Base URLs for accessing media content remain active for 60 minutes.',
    'Maximum page size is 100.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googlePhotosActionScopes.listPickedMedia)
  .input(
    z.object({
      sessionId: z.string().describe('The picker session ID to retrieve selected media from'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of items to return (1-100, default 50)'),
      pageToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      mediaItems: z.array(
        z.object({
          mediaItemId: z.string().describe('Unique identifier for the picked media item'),
          type: z.string().optional().describe('Type of the media item'),
          baseUrl: z
            .string()
            .optional()
            .describe('Base URL for accessing the media bytes (active for 60 minutes)'),
          mimeType: z.string().optional().describe('MIME type of the media item'),
          filename: z.string().optional().describe('Original filename'),
          width: z.number().optional().describe('Width in pixels'),
          height: z.number().optional().describe('Height in pixels'),
          creationTime: z.string().optional().describe('Creation time of the media item')
        })
      ),
      nextPageToken: z.string().optional().describe('Token to retrieve the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosPickerClient(ctx.auth.token);

    let result = await client.listPickedMediaItems(ctx.input.sessionId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let mediaItems = result.mediaItems.map(item => ({
      mediaItemId: item.id,
      type: item.type,
      baseUrl: item.mediaFile?.baseUrl,
      mimeType: item.mediaFile?.mimeType,
      filename: item.mediaFile?.filename,
      width: item.mediaFile?.mediaFileMetadata?.width,
      height: item.mediaFile?.mediaFileMetadata?.height,
      creationTime: item.mediaFile?.mediaFileMetadata?.creationTime
    }));

    return {
      output: {
        mediaItems,
        nextPageToken: result.nextPageToken
      },
      message: `Retrieved **${mediaItems.length}** picked media item(s).${result.nextPageToken ? ' More items available with pagination.' : ''}`
    };
  })
  .build();
