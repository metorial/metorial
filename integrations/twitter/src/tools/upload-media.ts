import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SIMPLE_MEDIA_CATEGORIES, SIMPLE_MEDIA_TYPES, TwitterClient } from '../lib/client';
import { twitterServiceError } from '../lib/errors';
import { spec } from '../spec';

let mediaUploadSchema = z.object({
  mediaId: z.string().describe('Media ID for attaching to posts or direct messages'),
  mediaKey: z.string().optional().describe('Media key returned by X'),
  expiresAfterSeconds: z.number().optional().describe('Seconds until the media expires'),
  processingState: z
    .enum(['succeeded', 'in_progress', 'pending', 'failed'])
    .optional()
    .describe('Processing state for media that requires processing'),
  processingProgressPercent: z.number().optional().describe('Processing progress percentage'),
  checkAfterSeconds: z
    .number()
    .optional()
    .describe('Seconds to wait before checking media processing status again'),
  size: z.number().optional().describe('Uploaded media size in bytes')
});

let mediaTypeSchema = z.enum(SIMPLE_MEDIA_TYPES);

let isSupportedMediaType = (value: string): value is (typeof SIMPLE_MEDIA_TYPES)[number] =>
  SIMPLE_MEDIA_TYPES.includes(value as (typeof SIMPLE_MEDIA_TYPES)[number]);

let normalizeMediaInput = (mediaBase64: string, mediaType?: string) => {
  let trimmed = mediaBase64.trim();
  let dataUriMatch = /^data:([^;,]+);base64,(.*)$/s.exec(trimmed);
  let detectedMediaType = dataUriMatch?.[1];
  let base64 = (dataUriMatch?.[2] ?? trimmed).replace(/\s/g, '');

  if (!base64) {
    throw twitterServiceError('mediaBase64 is required for upload.');
  }

  let candidateMediaType = mediaType ?? detectedMediaType;
  let resolvedMediaType: (typeof SIMPLE_MEDIA_TYPES)[number] | undefined;
  if (candidateMediaType) {
    if (!isSupportedMediaType(candidateMediaType)) {
      throw twitterServiceError(`Unsupported mediaType: ${candidateMediaType}.`);
    }
    resolvedMediaType = candidateMediaType;
  }

  return {
    mediaBase64: base64,
    mediaType: resolvedMediaType
  };
};

let mapMediaUpload = (data: any = {}) => ({
  mediaId: data.id === undefined ? '' : String(data.id),
  mediaKey: data.media_key,
  expiresAfterSeconds: data.expires_after_secs,
  processingState: data.processing_info?.state,
  processingProgressPercent: data.processing_info?.progress_percent,
  checkAfterSeconds: data.processing_info?.check_after_secs,
  size: data.size
});

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description:
    'Upload image or subtitle media to X for use in posts and direct messages, or check processing status for an uploaded media item.',
  instructions: [
    'Use action "upload" for simple image/subtitle uploads via the X API v2 media upload endpoint.',
    'Provide mediaBase64 as raw base64 or a data URI such as data:image/png;base64,...',
    'Use the returned mediaId in create_post mediaIds or send_direct_message mediaId.',
    'Use action "get_status" when processingInfo says the media is pending or in progress.'
  ],
  constraints: [
    'This tool handles the simple v2 upload endpoint for tweet_image, dm_image, and subtitles.',
    'Large videos and GIFs require the separate chunked INIT/APPEND/FINALIZE workflow and are not uploaded by this tool.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['upload', 'get_status'])
        .optional()
        .describe('Upload media or retrieve upload processing status'),
      mediaBase64: z
        .string()
        .optional()
        .describe('Raw base64 media content or a data URI for upload'),
      mediaCategory: z
        .enum(SIMPLE_MEDIA_CATEGORIES)
        .optional()
        .describe('Media use case, default tweet_image'),
      mediaType: mediaTypeSchema.optional().describe('MIME type of the media'),
      mediaId: z.string().optional().describe('Media ID for get_status'),
      additionalOwnerIds: z
        .array(z.string())
        .optional()
        .describe('Additional user IDs allowed to use the uploaded media'),
      shared: z.boolean().optional().describe('Whether the media should be shared')
    })
  )
  .output(
    z.object({
      media: mediaUploadSchema.describe('Uploaded media or media processing status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let action = ctx.input.action ?? 'upload';

    if (action === 'get_status') {
      if (!ctx.input.mediaId) {
        throw twitterServiceError('mediaId is required for get_status.');
      }

      let result = await client.getMediaUploadStatus(ctx.input.mediaId);
      let media = mapMediaUpload(result.data);
      return {
        output: { media },
        message: `Media ${media.mediaId} status: ${media.processingState ?? 'available'}.`
      };
    }

    if (!ctx.input.mediaBase64) {
      throw twitterServiceError('mediaBase64 is required for upload.');
    }

    let normalized = normalizeMediaInput(ctx.input.mediaBase64, ctx.input.mediaType);
    let result = await client.uploadMedia({
      mediaBase64: normalized.mediaBase64,
      mediaCategory: ctx.input.mediaCategory ?? 'tweet_image',
      mediaType: normalized.mediaType,
      additionalOwnerIds: ctx.input.additionalOwnerIds,
      shared: ctx.input.shared
    });

    let media = mapMediaUpload(result.data);
    if (!media.mediaId || media.mediaId === 'undefined') {
      throw twitterServiceError('X media upload response did not include a media ID.');
    }

    return {
      output: { media },
      message: `Uploaded media ${media.mediaId}.`
    };
  })
  .build();
