import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { instagramServiceError } from '../lib/errors';
import { spec } from '../spec';

export let publishMediaTool = SlateTool.create(spec, {
  name: 'Publish Media',
  key: 'publish_media',
  description: `Publish media to Instagram. Supports single image posts, Reels (video), Stories, and carousel albums. Publishing follows a two-step process internally: creating a media container and then publishing it. For carousels, provide multiple image/video URLs and they will be combined automatically.`,
  instructions: [
    'For carousel posts, provide the `carouselItems` array with image or video URLs.',
    'Video uploads (Reels) may take time to process. The tool will poll until the container is ready.',
    'Stories disappear after 24 hours.'
  ],
  constraints: [
    'Images must be JPEG format, max 8MB. Aspect ratio between 4:5 and 1.91:1.',
    'Videos must be MP4 or MOV, max 1GB, duration 3 seconds to 15 minutes for Reels.',
    'Carousel albums require 2-10 items.'
  ]
})
  .input(
    z.object({
      mediaType: z
        .enum(['IMAGE', 'REELS', 'STORIES', 'CAROUSEL'])
        .describe('Type of media to publish'),
      imageUrl: z
        .string()
        .optional()
        .describe('Public URL of the image to publish (for IMAGE and STORIES types)'),
      videoUrl: z
        .string()
        .optional()
        .describe('Public URL of the video to publish (for REELS and STORIES types)'),
      caption: z
        .string()
        .optional()
        .describe('Caption for the post. Supports hashtags and mentions.'),
      altText: z
        .string()
        .optional()
        .describe(
          'Accessibility alt text for image posts. Not supported for Reels or Stories.'
        ),
      locationId: z.string().optional().describe('Facebook Place ID for location tagging'),
      coverUrl: z.string().optional().describe('Custom cover image URL for Reels'),
      shareToFeed: z
        .boolean()
        .optional()
        .describe('Whether to share Reels to the main feed (default: true)'),
      userTags: z
        .array(
          z.object({
            username: z.string().describe('Instagram username to tag'),
            x: z.number().min(0).max(1).describe('Horizontal position (0.0-1.0)'),
            y: z.number().min(0).max(1).describe('Vertical position (0.0-1.0)')
          })
        )
        .optional()
        .describe('Users to tag in the image'),
      carouselItems: z
        .array(
          z.object({
            imageUrl: z.string().optional().describe('Image URL for this carousel item'),
            videoUrl: z.string().optional().describe('Video URL for this carousel item'),
            altText: z
              .string()
              .optional()
              .describe('Accessibility alt text for image carousel items')
          })
        )
        .optional()
        .describe('Items for carousel posts (2-10 items)'),
      userId: z
        .string()
        .optional()
        .describe('Instagram user ID. Defaults to the authenticated user.')
    })
  )
  .output(
    z.object({
      mediaId: z.string().describe('ID of the published media'),
      permalink: z.string().optional().describe('Permanent link to the published media')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let effectiveUserId = ctx.input.userId || ctx.auth.userId || 'me';
    let { mediaType } = ctx.input;
    let apiBaseUrl = (ctx.auth.apiBaseUrl || '').replace(/\/$/, '');

    if (apiBaseUrl === 'https://graph.instagram.com' && ctx.input.userTags?.length) {
      throw instagramServiceError(
        'userTags are not supported by Instagram API with Instagram Login. Reauthorize with Facebook Login for Business for tagging-capable publishing.'
      );
    }

    let containerId: string;

    if (mediaType === 'CAROUSEL') {
      let carouselItems = ctx.input.carouselItems;
      if (!carouselItems || carouselItems.length < 2 || carouselItems.length > 10) {
        throw instagramServiceError(
          'carouselItems must contain 2-10 items for CAROUSEL media'
        );
      }

      ctx.progress('Creating carousel item containers...');

      let childIds: string[] = [];
      for (let item of carouselItems) {
        if (!item.imageUrl && !item.videoUrl) {
          throw instagramServiceError(
            'Each carousel item requires either imageUrl or videoUrl'
          );
        }
        if (item.imageUrl && item.videoUrl) {
          throw instagramServiceError(
            'Each carousel item can include only one of imageUrl or videoUrl'
          );
        }

        let childContainer = await client.createMediaContainer(effectiveUserId, {
          imageUrl: item.imageUrl,
          videoUrl: item.videoUrl,
          altText: item.altText,
          isCarouselItem: true,
          mediaType: item.videoUrl ? 'VIDEO' : 'IMAGE'
        });
        childIds.push(childContainer.id);

        // Poll for video carousel items
        if (item.videoUrl) {
          await waitForContainer(client, childContainer.id);
        }
      }

      ctx.progress('Creating carousel container...');
      let carouselContainer = await client.createMediaContainer(effectiveUserId, {
        mediaType: 'CAROUSEL',
        caption: ctx.input.caption,
        locationId: ctx.input.locationId,
        children: childIds
      });
      containerId = carouselContainer.id;
    } else {
      if (mediaType === 'IMAGE' && !ctx.input.imageUrl) {
        throw instagramServiceError('imageUrl is required for IMAGE media');
      }
      if (mediaType === 'REELS' && !ctx.input.videoUrl) {
        throw instagramServiceError('videoUrl is required for REELS media');
      }
      if (mediaType === 'STORIES' && !ctx.input.imageUrl && !ctx.input.videoUrl) {
        throw instagramServiceError('imageUrl or videoUrl is required for STORIES media');
      }
      if (ctx.input.imageUrl && ctx.input.videoUrl && mediaType !== 'STORIES') {
        throw instagramServiceError('Provide only one of imageUrl or videoUrl');
      }

      ctx.progress('Creating media container...');
      let container = await client.createMediaContainer(effectiveUserId, {
        imageUrl: ctx.input.imageUrl,
        videoUrl: ctx.input.videoUrl,
        caption: ctx.input.caption,
        altText: ctx.input.altText,
        mediaType,
        locationId: ctx.input.locationId,
        userTags: ctx.input.userTags,
        coverUrl: ctx.input.coverUrl,
        shareToFeed: ctx.input.shareToFeed
      });
      containerId = container.id;

      if (mediaType === 'REELS' || ctx.input.videoUrl) {
        await waitForContainer(client, containerId);
      }
    }

    ctx.progress('Publishing media...');
    let published = await client.publishMedia(effectiveUserId, containerId);

    let permalink: string | undefined;
    try {
      let mediaDetails = await client.getMedia(published.id, 'id,permalink');
      permalink = mediaDetails.permalink;
    } catch {
      // Non-critical failure
    }

    return {
      output: {
        mediaId: published.id,
        permalink
      },
      message: `Published ${mediaType} post — media ID: **${published.id}**${permalink ? ` — [View on Instagram](${permalink})` : ''}`
    };
  })
  .build();

let waitForContainer = async (
  client: InstagramClient,
  containerId: string,
  maxAttempts = 30
) => {
  for (let i = 0; i < maxAttempts; i++) {
    let status = await client.getContainerStatus(containerId);
    if (status.status_code === 'FINISHED') return;
    if (status.status_code === 'ERROR') {
      throw instagramServiceError(
        `Media container failed: ${status.status || 'Unknown error'}`
      );
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw instagramServiceError('Media container processing timed out after 60 seconds');
};
