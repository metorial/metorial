import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client, MAX_THUMBNAIL_BYTES } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';
import { decodeBase64Content, validateThumbnailContent } from './media-input';

const thumbnailSizes = ['default', 'medium', 'high', 'standard', 'maxres'] as const;

export let setThumbnail = SlateTool.create(spec, {
  name: 'Set Video Thumbnail',
  key: 'set_thumbnail',
  description:
    'Upload and set a custom JPEG or PNG thumbnail for a video owned by the authenticated YouTube channel.',
  instructions: [
    `YouTube accepts JPEG or PNG thumbnail uploads up to ${MAX_THUMBNAIL_BYTES} bytes.`,
    'The authenticated channel must own the video and be allowed to upload custom thumbnails.'
  ]
})
  .scopes(youtubeActionScopes.setThumbnail)
  .input(
    z.object({
      videoId: z.string().min(1).describe('ID of the owned video'),
      contentBase64: z.string().describe('Base64-encoded JPEG or PNG image content'),
      mimeType: z.enum(['image/jpeg', 'image/png']).describe('Thumbnail image MIME type')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Video ID whose thumbnail was updated'),
      mimeType: z.string().describe('Uploaded image MIME type'),
      sizeBytes: z.number().describe('Uploaded thumbnail byte length'),
      thumbnails: z
        .array(
          z.object({
            size: z.enum(thumbnailSizes).describe('YouTube thumbnail size variant'),
            url: z.string().describe('YouTube-hosted thumbnail URL'),
            width: z.number().optional().describe('Thumbnail width in pixels'),
            height: z.number().optional().describe('Thumbnail height in pixels')
          })
        )
        .describe('Thumbnail variants returned by YouTube')
    })
  )
  .handleInvocation(async ctx => {
    let content = decodeBase64Content(ctx.input.contentBase64, 'contentBase64');
    validateThumbnailContent(content, ctx.input.mimeType);
    if (content.length > MAX_THUMBNAIL_BYTES) {
      throw youtubeServiceError(
        `contentBase64 exceeds YouTube's ${MAX_THUMBNAIL_BYTES}-byte thumbnail limit.`
      );
    }

    let client = Client.fromAuth(ctx.auth);
    let result = await client.setThumbnail({
      videoId: ctx.input.videoId,
      content,
      mimeType: ctx.input.mimeType
    });
    let thumbnails = (result.items ?? []).flatMap(item =>
      thumbnailSizes.flatMap(size => {
        let thumbnail = item[size];
        return thumbnail ? [{ size, ...thumbnail }] : [];
      })
    );
    if (thumbnails.length === 0) {
      throw youtubeServiceError(
        'YouTube set the thumbnail without returning hosted thumbnail metadata.'
      );
    }
    return {
      output: {
        videoId: ctx.input.videoId,
        mimeType: ctx.input.mimeType,
        sizeBytes: content.length,
        thumbnails
      },
      message: `Set a custom thumbnail for video \`${ctx.input.videoId}\`.`
    };
  })
  .build();
