import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client, MAX_BASE64_VIDEO_BYTES, MAX_SOURCE_URL_UPLOAD_BYTES } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';
import { decodeBase64Content } from './media-input';

export let uploadVideo = SlateTool.create(spec, {
  name: 'Upload Video',
  key: 'upload_video',
  description:
    'Upload a video with metadata through the YouTube Data API resumable protocol. Provide exactly one of contentBase64 or a public HTTPS sourceUrl.',
  instructions: [
    `contentBase64 is limited to ${MAX_BASE64_VIDEO_BYTES} decoded bytes because model/tool payloads are not suitable for large media.`,
    `Use sourceUrl for larger files, up to an operational limit of ${MAX_SOURCE_URL_UPLOAD_BYTES} bytes (2 GiB). It must be a public HTTPS URL without embedded credentials, redirects are revalidated, and the server must support HTTP byte ranges with a reported total file size.`,
    'Uploads default to private and subscriber notifications default to false. Unverified Google API projects may be forced to private viewing by YouTube.'
  ]
})
  .scopes(youtubeActionScopes.uploadVideo)
  .input(
    z.object({
      title: z.string().min(1).describe('Video title'),
      description: z.string().optional().describe('Video description'),
      tags: z.array(z.string()).optional().describe('Video keyword tags'),
      categoryId: z
        .string()
        .optional()
        .describe('YouTube video category ID; discover values with list_metadata'),
      privacyStatus: z
        .enum(['private', 'public', 'unlisted'])
        .optional()
        .describe('Initial privacy status; defaults to private'),
      notifySubscribers: z
        .boolean()
        .optional()
        .describe('Whether to notify channel subscribers; defaults to false'),
      contentBase64: z
        .string()
        .optional()
        .describe(
          `Base64-encoded video content, limited to ${MAX_BASE64_VIDEO_BYTES} decoded bytes; provide exactly one source field`
        ),
      sourceUrl: z
        .string()
        .optional()
        .describe(
          `Public HTTPS video URL with HTTP byte-range support for server-side fetching, limited to ${MAX_SOURCE_URL_UPLOAD_BYTES} bytes (2 GiB); provide exactly one source field`
        ),
      mimeType: z
        .string()
        .optional()
        .describe(
          'Video MIME type (video/* or application/octet-stream); sourceUrl defaults to its response type and base64 defaults to application/octet-stream'
        )
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Uploaded YouTube video ID'),
      title: z.string().describe('Uploaded video title'),
      privacyStatus: z.string().describe('Initial video privacy status'),
      uploadStatus: z.string().optional().describe('YouTube processing/upload status'),
      sourceType: z.enum(['base64', 'url']).describe('Source path used for the upload'),
      mimeType: z.string().describe('MIME type sent to YouTube'),
      sizeBytes: z.number().describe('Uploaded video byte length')
    })
  )
  .handleInvocation(async ctx => {
    let hasBase64 = ctx.input.contentBase64 !== undefined;
    let hasSourceUrl = ctx.input.sourceUrl !== undefined;
    if (hasBase64 === hasSourceUrl) {
      throw youtubeServiceError(
        'Provide exactly one video source: contentBase64 or sourceUrl.'
      );
    }

    let content: Buffer | undefined;
    if (ctx.input.contentBase64 !== undefined) {
      content = decodeBase64Content(ctx.input.contentBase64, 'contentBase64');
      if (content.length > MAX_BASE64_VIDEO_BYTES) {
        throw youtubeServiceError(
          `contentBase64 exceeds the ${MAX_BASE64_VIDEO_BYTES}-byte decoded limit; use sourceUrl for larger videos.`
        );
      }
    }

    let client = Client.fromAuth(ctx.auth);
    let result = await client.uploadVideo({
      title: ctx.input.title,
      description: ctx.input.description,
      tags: ctx.input.tags,
      categoryId: ctx.input.categoryId,
      privacyStatus: ctx.input.privacyStatus,
      notifySubscribers: ctx.input.notifySubscribers,
      mimeType: ctx.input.mimeType,
      content,
      sourceUrl: ctx.input.sourceUrl
    });
    if (!result.video.id) {
      throw youtubeServiceError('YouTube upload completed without returning a video ID.');
    }

    return {
      output: {
        videoId: result.video.id,
        title: result.video.snippet?.title ?? ctx.input.title,
        privacyStatus:
          result.video.status?.privacyStatus ?? ctx.input.privacyStatus ?? 'private',
        uploadStatus: result.video.status?.uploadStatus,
        sourceType: result.sourceType,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes
      },
      message: `Uploaded video **${result.video.snippet?.title ?? ctx.input.title}** as \`${result.video.id}\`.`
    };
  })
  .build();
