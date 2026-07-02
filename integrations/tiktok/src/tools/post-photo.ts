import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokConsumerClient } from '../lib/client';
import { tiktokServiceError } from '../lib/errors';
import { spec } from '../spec';

export let postPhoto = SlateTool.create(spec, {
  name: 'Post Photo',
  key: 'post_photo',
  description: `Initialize a photo post to the authenticated user's TikTok profile by providing publicly accessible image URLs. Returns a publish ID to track the post status.`,
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
        .describe('Privacy level for the published photo post.'),
      title: z.string().max(90).optional().describe('Photo post title (max 90 UTF-16 runes).'),
      description: z
        .string()
        .max(4000)
        .optional()
        .describe('Photo post description (max 4000 UTF-16 runes).'),
      photoImageUrls: z
        .array(z.string())
        .min(1)
        .max(35)
        .describe('Public URLs of the images to post (1-35 images).'),
      photoCoverIndex: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Zero-based index of the image to use as the cover.'),
      disableComment: z.boolean().optional().describe('Disable comments for this post.'),
      autoAddMusic: z.boolean().optional().describe('Automatically add recommended music.'),
      brandContentToggle: z.boolean().optional().describe('Mark as paid partnership content.'),
      brandOrganicToggle: z
        .boolean()
        .optional()
        .describe("Mark as promoting creator's own business."),
      isAigc: z.boolean().optional().describe('Label post as AI-generated content.')
    })
  )
  .output(
    z.object({
      publishId: z.string().describe('Identifier to track the posting process.')
    })
  )
  .handleInvocation(async ctx => {
    let photoCoverIndex = ctx.input.photoCoverIndex ?? 0;
    if (photoCoverIndex >= ctx.input.photoImageUrls.length) {
      throw tiktokServiceError('photoCoverIndex must reference an item in photoImageUrls.');
    }

    let client = new TikTokConsumerClient({ token: ctx.auth.token });

    let result = await client.initPhotoPost({
      postInfo: {
        privacyLevel: ctx.input.privacyLevel,
        title: ctx.input.title,
        description: ctx.input.description,
        disableComment: ctx.input.disableComment,
        autoAddMusic: ctx.input.autoAddMusic,
        brandContentToggle: ctx.input.brandContentToggle,
        brandOrganicToggle: ctx.input.brandOrganicToggle,
        isAigc: ctx.input.isAigc
      },
      sourceInfo: {
        source: 'PULL_FROM_URL',
        photoImages: ctx.input.photoImageUrls,
        photoCoverIndex
      }
    });

    return {
      output: result,
      message: `Photo post initialized with publish ID \`${result.publishId}\` using ${ctx.input.photoImageUrls.length} image(s).`
    };
  })
  .build();
