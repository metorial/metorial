import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { spec } from '../spec';

let mediaItemSchema = z.object({
  mediaId: z.string().describe('Media ID'),
  caption: z.string().optional().describe('Caption text'),
  mediaType: z.string().optional().describe('Type of media: IMAGE, VIDEO, CAROUSEL_ALBUM'),
  mediaUrl: z.string().optional().describe('URL of the media'),
  thumbnailUrl: z.string().optional().describe('Thumbnail URL for video media'),
  permalink: z.string().optional().describe('Permanent link to the media on Instagram'),
  timestamp: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp of when the media was published'),
  likeCount: z.number().optional().describe('Number of likes'),
  commentsCount: z.number().optional().describe('Number of comments'),
  isCommentEnabled: z.boolean().optional().describe('Whether comments are enabled'),
  mediaProductType: z
    .string()
    .optional()
    .describe('Product surface such as FEED, REELS, or STORY'),
  altText: z.string().optional().describe('Accessibility alt text when available'),
  username: z.string().optional().describe('Username of the media owner'),
  children: z
    .array(
      z.object({
        mediaId: z.string().describe('Child media ID'),
        mediaType: z.string().optional().describe('Child media type'),
        mediaUrl: z.string().optional().describe('Child media URL')
      })
    )
    .optional()
    .describe('Child media items for carousel albums')
});

export let getMediaTool = SlateTool.create(spec, {
  name: 'Get Media',
  key: 'get_media',
  description: `Retrieve Instagram media. Fetch a single post by media ID for full details including carousel children, or list recent media from an account with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mediaId: z
        .string()
        .optional()
        .describe(
          'Specific media ID to retrieve. If provided, returns detailed info for that single post.'
        ),
      userId: z
        .string()
        .optional()
        .describe('User ID to list media from. Defaults to the authenticated user.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of media items to return (default: 25, max: 100)'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      media: z.array(mediaItemSchema).describe('List of media items'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results'),
      previousCursor: z.string().optional().describe('Cursor for the previous page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    if (ctx.input.mediaId) {
      let media = await client.getMedia(ctx.input.mediaId);

      let children = media.children?.data?.map((c: any) => ({
        mediaId: c.id,
        mediaType: c.media_type,
        mediaUrl: c.media_url
      }));

      return {
        output: {
          media: [
            {
              mediaId: media.id,
              caption: media.caption,
              mediaType: media.media_type,
              mediaUrl: media.media_url,
              thumbnailUrl: media.thumbnail_url,
              permalink: media.permalink,
              timestamp: media.timestamp,
              likeCount: media.like_count,
              commentsCount: media.comments_count,
              isCommentEnabled: media.is_comment_enabled,
              mediaProductType: media.media_product_type,
              altText: media.alt_text,
              username: media.username,
              children
            }
          ]
        },
        message: `Retrieved media **${media.id}** (${media.media_type}) — ${media.like_count ?? 0} likes, ${media.comments_count ?? 0} comments.`
      };
    }

    let effectiveUserId = ctx.input.userId || ctx.auth.userId || 'me';
    let result = await client.listMedia(effectiveUserId, {
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let mediaItems = (result.data || []).map((m: any) => ({
      mediaId: m.id,
      caption: m.caption,
      mediaType: m.media_type,
      mediaUrl: m.media_url,
      thumbnailUrl: m.thumbnail_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
      likeCount: m.like_count,
      commentsCount: m.comments_count,
      isCommentEnabled: m.is_comment_enabled,
      mediaProductType: m.media_product_type,
      altText: m.alt_text
    }));

    return {
      output: {
        media: mediaItems,
        nextCursor: result.paging?.cursors?.after,
        previousCursor: result.paging?.cursors?.before
      },
      message: `Retrieved **${mediaItems.length}** media items.`
    };
  })
  .build();
