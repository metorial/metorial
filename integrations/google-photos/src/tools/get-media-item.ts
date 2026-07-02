import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosLibraryClient, type MediaItemResponse } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

let mediaMetadataSchema = z
  .object({
    creationTime: z.string().optional().describe('Creation time of the media item (RFC 3339)'),
    width: z.string().optional().describe('Width in pixels'),
    height: z.string().optional().describe('Height in pixels'),
    photo: z
      .object({
        cameraMake: z.string().optional().describe('Camera manufacturer'),
        cameraModel: z.string().optional().describe('Camera model'),
        focalLength: z.number().optional().describe('Focal length in mm'),
        apertureFNumber: z.number().optional().describe('Aperture f-number'),
        isoEquivalent: z.number().optional().describe('ISO equivalent'),
        exposureTime: z.string().optional().describe('Exposure time')
      })
      .optional()
      .describe('Photo-specific metadata'),
    video: z
      .object({
        cameraMake: z.string().optional().describe('Camera manufacturer'),
        cameraModel: z.string().optional().describe('Camera model'),
        fps: z.number().optional().describe('Frame rate'),
        status: z.string().optional().describe('Processing status (PROCESSING, READY, FAILED)')
      })
      .optional()
      .describe('Video-specific metadata')
  })
  .optional();

export let getMediaItem = SlateTool.create(spec, {
  name: 'Get Media Item',
  key: 'get_media_item',
  description: `Retrieve detailed information about one or more media items by their IDs. Returns metadata including filename, MIME type, dimensions, camera info, and access URLs. Supports batch retrieval of up to 50 items.`,
  constraints: [
    'Only media items created by the app can be accessed.',
    'Base URLs expire after 60 minutes.',
    'Up to 50 media items can be retrieved in a single batch request.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googlePhotosActionScopes.getMediaItem)
  .input(
    z.object({
      mediaItemIds: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe('One or more media item IDs to retrieve (max 50)')
    })
  )
  .output(
    z.object({
      mediaItems: z.array(
        z.object({
          mediaItemId: z.string().describe('Unique identifier for the media item'),
          description: z.string().optional().describe('User-provided description'),
          productUrl: z.string().optional().describe('Google Photos URL for the media item'),
          baseUrl: z
            .string()
            .optional()
            .describe('Base URL for accessing the media bytes (expires in 60 minutes)'),
          mimeType: z.string().optional().describe('MIME type of the media item'),
          filename: z.string().optional().describe('Original filename'),
          mediaMetadata: mediaMetadataSchema
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosLibraryClient(ctx.auth.token);

    let mediaItems: MediaItemResponse[];

    if (ctx.input.mediaItemIds.length === 1) {
      let item = await client.getMediaItem(ctx.input.mediaItemIds[0]!);
      mediaItems = [item];
    } else {
      let result = await client.batchGetMediaItems(ctx.input.mediaItemIds);
      mediaItems = result.mediaItemResults
        .filter(
          (r): r is typeof r & { mediaItem: NonNullable<typeof r.mediaItem> } => !!r.mediaItem
        )
        .map(r => r.mediaItem);
    }

    let output = mediaItems.map(item => ({
      mediaItemId: item.id,
      description: item.description,
      productUrl: item.productUrl,
      baseUrl: item.baseUrl,
      mimeType: item.mimeType,
      filename: item.filename,
      mediaMetadata: item.mediaMetadata
    }));

    return {
      output: { mediaItems: output },
      message: `Retrieved **${output.length}** media item(s).`
    };
  })
  .build();
