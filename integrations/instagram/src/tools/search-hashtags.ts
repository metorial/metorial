import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { spec } from '../spec';

export let searchHashtagsTool = SlateTool.create(spec, {
  name: 'Search Hashtags',
  key: 'search_hashtags',
  description: `Search for recent or top public posts tagged with a specific hashtag. This is the only way to search public content on Instagram via the API. Returns posts with their captions, media URLs, and engagement metrics.`,
  constraints: [
    'Limited to 30 unique hashtag searches per 7-day rolling window per user.',
    'Only returns public posts from Business and Creator accounts.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      hashtag: z.string().describe('Hashtag to search for (without the # symbol)'),
      ranking: z
        .enum(['recent', 'top'])
        .optional()
        .describe(
          'Sort order: "recent" for latest posts, "top" for most popular (default: "recent")'
        ),
      userId: z
        .string()
        .optional()
        .describe('Instagram user ID. Defaults to the authenticated user.')
    })
  )
  .output(
    z.object({
      hashtagId: z.string().describe('Instagram hashtag ID'),
      media: z
        .array(
          z.object({
            mediaId: z.string().describe('Media ID'),
            caption: z.string().optional().describe('Caption text'),
            mediaType: z
              .string()
              .optional()
              .describe('Media type: IMAGE, VIDEO, CAROUSEL_ALBUM'),
            mediaUrl: z.string().optional().describe('Media URL'),
            permalink: z.string().optional().describe('Link to the post'),
            timestamp: z.string().optional().describe('Published timestamp'),
            likeCount: z.number().optional().describe('Number of likes'),
            commentsCount: z.number().optional().describe('Number of comments')
          })
        )
        .describe('Media posts matching the hashtag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let effectiveUserId = ctx.input.userId || ctx.auth.userId || 'me';
    let ranking = ctx.input.ranking || 'recent';

    ctx.progress(`Searching for #${ctx.input.hashtag}...`);
    let searchResult = await client.searchHashtag(effectiveUserId, ctx.input.hashtag);
    let hashtagId = searchResult.data?.[0]?.id;

    if (!hashtagId) {
      return {
        output: { hashtagId: '', media: [] },
        message: `No results found for #${ctx.input.hashtag}.`
      };
    }

    let mediaResult =
      ranking === 'top'
        ? await client.getHashtagTopMedia(hashtagId, effectiveUserId)
        : await client.getHashtagRecentMedia(hashtagId, effectiveUserId);

    let media = (mediaResult.data || []).map((m: any) => ({
      mediaId: m.id,
      caption: m.caption,
      mediaType: m.media_type,
      mediaUrl: m.media_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
      likeCount: m.like_count,
      commentsCount: m.comments_count
    }));

    return {
      output: { hashtagId, media },
      message: `Found **${media.length}** ${ranking} posts for **#${ctx.input.hashtag}**.`
    };
  })
  .build();
