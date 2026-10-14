import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountMedia = SlateTool.create(spec, {
  name: 'Get Account Media',
  key: 'get_account_media',
  description: `Retrieve recent posts, videos, or media content for an influencer on Instagram, YouTube, or TikTok. Returns post details including engagement metrics, thumbnails, and content metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z.enum(['instagram', 'youtube', 'tiktok']).describe('Social media platform'),
      username: z
        .string()
        .describe(
          'Username or channel name/ID of the influencer. For TikTok, use the channel ID from get_influencer_report.'
        ),
      page: z.number().optional().describe('Page number for YouTube pagination'),
      channelId: z
        .string()
        .optional()
        .describe(
          'TikTok channel ID from get_influencer_report, used instead of username when provided.'
        )
    })
  )
  .output(
    z.object({
      media: z
        .array(z.any())
        .describe('Array of media/post objects with content details and engagement metrics'),
      currentPage: z.number().optional().describe('Current YouTube media page'),
      totalPages: z.number().optional().describe('Total YouTube media pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let response: any;

    switch (ctx.input.platform) {
      case 'instagram':
        response = await client.getInstagramMedia(ctx.input.username);
        break;
      case 'youtube':
        response = await client.getYoutubeMedia(ctx.input.username, ctx.input.page);
        break;
      case 'tiktok':
        response = await client.getTiktokMedia(ctx.input.channelId ?? ctx.input.username);
        break;
    }

    let result = response?.result ?? response;
    let rawMedia = result?.media ?? (Array.isArray(result) ? result : []);
    let media = Array.isArray(rawMedia)
      ? rawMedia
      : isApiErrorRecord(rawMedia)
        ? Object.values(rawMedia)
        : [];

    return {
      output: {
        media,
        currentPage: result?.current_page,
        totalPages: result?.total_pages
      },
      message: `Retrieved **${media.length}** media items for **${ctx.input.username}** on ${ctx.input.platform}.`
    };
  })
  .build();
