import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadMedia = SlateTool.create(spec, {
  name: 'Upload Media',
  key: 'upload_media',
  description: `Upload a media file to Sprout Social from a publicly accessible URL for use with publishing posts. Returns a media ID that can be used when creating draft posts. Supports images (PNG, JPEG, GIF, WebP, HEIC, AVIF) and videos (MP4, MOV, AVI, MPEG, WebM).`,
  instructions: [
    'Provide a publicly accessible HTTP/HTTPS URL to the media file.',
    'Use the returned mediaId when creating draft posts via the Create Draft Post tool.',
    'Media is retained for 24 hours before removal unless used by a post.'
  ],
  constraints: [
    'Media files must be under 50 MB for URL upload.',
    'Sprout does not transcode media into network-compatible versions; files must meet individual social network requirements.',
    'Uploaded media is retained for 24 hours only.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaUrl: z
        .string()
        .describe('Publicly accessible HTTP/HTTPS URL of the media file to upload.')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('Sprout Social media ID for use in publishing posts.'),
      expirationTime: z
        .string()
        .describe('ISO 8601 timestamp when the media will expire if unused.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId
    });

    let result = await client.uploadMediaFromUrl(ctx.input.mediaUrl);
    let media = result?.data?.[0];

    if (!media) {
      throw new Error('Media upload failed: no media data returned.');
    }

    return {
      output: {
        mediaId: media.media_id,
        expirationTime: media.expiration_time
      },
      message: `Uploaded media successfully. Media ID: \`${media.media_id}\`. Expires at ${media.expiration_time}.`
    };
  });
