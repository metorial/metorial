import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { facebookServiceError } from '../lib/errors';
import { spec } from '../spec';

let isBlank = (value: string | undefined) => !value || value.trim().length === 0;

export let publishContent = SlateTool.create(spec, {
  name: 'Publish Content',
  key: 'publish_content',
  description: `Publish a post, photo, or video to a Facebook Page.
The tool automatically retrieves the Page access token. Supports scheduling feed posts for future publication.
Use \`contentType\` to specify whether you are posting text, a photo, or a video.`,
  instructions: [
    'Provide the `pageId` for the Page that should publish the content.',
    'For post publishing, provide `message`, `link`, or both.',
    'Photo publishing requires a publicly accessible `photoUrl`.',
    'Video publishing requires a publicly accessible `videoUrl`.',
    'To schedule a post, provide `scheduledPublishTime` as a Unix timestamp (must be 10 min to 6 months in the future).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pageId: z.string().describe('Page ID to publish to'),
      contentType: z
        .enum(['post', 'photo', 'video'])
        .default('post')
        .describe('Type of content to publish'),
      message: z.string().optional().describe('Text message for the post'),
      link: z.string().optional().describe('URL to share (for post type)'),
      photoUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL of the photo to publish'),
      videoUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL of the video to publish'),
      videoTitle: z.string().optional().describe('Title for the video'),
      scheduledPublishTime: z
        .number()
        .optional()
        .describe('Unix timestamp to schedule the post for future publication')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the created post or media')
    })
  )
  .handleInvocation(async ctx => {
    let pageId = ctx.input.pageId?.trim();

    if (!pageId) {
      throw facebookServiceError('pageId is required to publish Facebook Page content');
    }

    if (
      ctx.input.contentType === 'post' &&
      isBlank(ctx.input.message) &&
      isBlank(ctx.input.link)
    ) {
      throw facebookServiceError(
        'message or link is required to publish a Facebook Page post'
      );
    }

    if (ctx.input.contentType === 'photo' && isBlank(ctx.input.photoUrl)) {
      throw facebookServiceError('photoUrl is required to publish a Facebook Page photo');
    }

    if (ctx.input.contentType === 'video' && isBlank(ctx.input.videoUrl)) {
      throw facebookServiceError('videoUrl is required to publish a Facebook Page video');
    }

    if (ctx.input.scheduledPublishTime !== undefined) {
      let now = Math.floor(Date.now() / 1000);
      let minScheduledTime = now + 10 * 60;
      let maxScheduledTime = now + 6 * 30 * 24 * 60 * 60;

      if (
        ctx.input.scheduledPublishTime < minScheduledTime ||
        ctx.input.scheduledPublishTime > maxScheduledTime
      ) {
        throw facebookServiceError(
          'scheduledPublishTime must be between 10 minutes and 6 months in the future'
        );
      }
    }

    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let targetId = pageId;
    let pageAccessToken = await client.getPageAccessToken(pageId);

    let result: { id: string; post_id?: string };

    if (ctx.input.contentType === 'photo') {
      result = await client.publishPhoto(
        targetId,
        { url: ctx.input.photoUrl, caption: ctx.input.message },
        pageAccessToken
      );
    } else if (ctx.input.contentType === 'video') {
      result = await client.publishVideo(
        targetId,
        {
          file_url: ctx.input.videoUrl,
          description: ctx.input.message,
          title: ctx.input.videoTitle
        },
        pageAccessToken
      );
    } else {
      result = await client.publishPost(
        targetId,
        {
          message: ctx.input.message,
          link: ctx.input.link,
          scheduledPublishTime: ctx.input.scheduledPublishTime
        },
        pageAccessToken
      );
    }

    let postId = result.post_id || result.id;

    return {
      output: { postId },
      message: ctx.input.scheduledPublishTime
        ? `Scheduled ${ctx.input.contentType} **${postId}** for future publication.`
        : `Published ${ctx.input.contentType} **${postId}** successfully.`
    };
  })
  .build();
