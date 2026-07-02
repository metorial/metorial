import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokConsumerClient } from '../lib/client';
import { tiktokServiceError } from '../lib/errors';
import { spec } from '../spec';

export let postVideo = SlateTool.create(spec, {
  name: 'Post Video',
  key: 'post_video',
  description: `Initialize a video post to the authenticated user's TikTok profile. Supports posting from a public URL or initializing a file upload. Returns a publish ID to track the post status and, for file uploads, an upload URL.`,
  instructions: [
    'Query creator info first to determine available privacy levels and posting constraints.',
    'For URL-based posting, provide a publicly accessible video URL.',
    'For file uploads, you will receive an upload URL — send the video via PUT request to that URL.'
  ],
  constraints: [
    'Requires the video.publish scope.',
    'Rate limited to 6 requests per minute per user.',
    'Unaudited API clients restrict all posts to private (SELF_ONLY) visibility.'
  ]
})
  .input(
    z.object({
      privacyLevel: z
        .enum([
          'PUBLIC_TO_EVERYONE',
          'MUTUAL_FOLLOW_FRIENDS',
          'FOLLOWER_OF_CREATOR',
          'SELF_ONLY'
        ])
        .describe('Privacy level for the published video.'),
      title: z
        .string()
        .max(2200)
        .optional()
        .describe('Video caption (max 2200 characters). Supports hashtags and mentions.'),
      source: z
        .enum(['PULL_FROM_URL', 'FILE_UPLOAD'])
        .describe('How the video will be provided.'),
      videoUrl: z
        .string()
        .optional()
        .describe('Public URL of the video (required when source is PULL_FROM_URL).'),
      videoSize: z
        .number()
        .optional()
        .describe('File size in bytes (required when source is FILE_UPLOAD).'),
      chunkSize: z.number().optional().describe('Chunk size in bytes for chunked upload.'),
      totalChunkCount: z.number().optional().describe('Total number of upload chunks.'),
      disableDuet: z.boolean().optional().describe('Disable duets for this video.'),
      disableStitch: z.boolean().optional().describe('Disable stitches for this video.'),
      disableComment: z.boolean().optional().describe('Disable comments for this video.'),
      videoCoverTimestampMs: z
        .number()
        .optional()
        .describe('Millisecond timestamp of the frame to use as cover image.'),
      brandContentToggle: z.boolean().optional().describe('Mark as paid partnership content.'),
      brandOrganicToggle: z
        .boolean()
        .optional()
        .describe("Mark as promoting creator's own business."),
      isAigc: z.boolean().optional().describe('Label video as AI-generated content.')
    })
  )
  .output(
    z.object({
      publishId: z.string().describe('Identifier to track the posting process.'),
      uploadUrl: z
        .string()
        .optional()
        .describe('URL to upload the video file to (only for FILE_UPLOAD source).')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.source === 'PULL_FROM_URL' && !ctx.input.videoUrl) {
      throw tiktokServiceError('videoUrl is required when source is PULL_FROM_URL.');
    }

    if (ctx.input.source === 'FILE_UPLOAD') {
      let missingFields = [
        ['videoSize', ctx.input.videoSize],
        ['chunkSize', ctx.input.chunkSize],
        ['totalChunkCount', ctx.input.totalChunkCount]
      ]
        .filter(([, value]) => typeof value !== 'number')
        .map(([field]) => field);

      if (missingFields.length > 0) {
        throw tiktokServiceError(
          `${missingFields.join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required when source is FILE_UPLOAD.`
        );
      }
    }

    let client = new TikTokConsumerClient({ token: ctx.auth.token });

    let result = await client.initVideoPost({
      postInfo: {
        privacyLevel: ctx.input.privacyLevel,
        title: ctx.input.title,
        disableDuet: ctx.input.disableDuet,
        disableStitch: ctx.input.disableStitch,
        disableComment: ctx.input.disableComment,
        videoCoverTimestampMs: ctx.input.videoCoverTimestampMs,
        brandContentToggle: ctx.input.brandContentToggle,
        brandOrganicToggle: ctx.input.brandOrganicToggle,
        isAigc: ctx.input.isAigc
      },
      sourceInfo: {
        source: ctx.input.source,
        videoUrl: ctx.input.videoUrl,
        videoSize: ctx.input.videoSize,
        chunkSize: ctx.input.chunkSize,
        totalChunkCount: ctx.input.totalChunkCount
      }
    });

    let msg = `Video post initialized with publish ID \`${result.publishId}\`.`;
    if (result.uploadUrl) {
      msg += ' Upload URL provided for file upload.';
    }

    return {
      output: result,
      message: msg
    };
  })
  .build();
