import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List comment threads on a YouTube video or channel. Returns top-level comments with reply counts, or list replies to a specific comment. Supports filtering by search terms and moderation status.`,
  tags: {
    readOnly: true
  }
})
  .scopes(youtubeActionScopes.listComments)
  .input(
    z.object({
      videoId: z.string().optional().describe('Video ID to list comments for'),
      channelId: z.string().optional().describe('Channel ID to list all comment threads for'),
      allThreadsRelatedToChannelId: z
        .string()
        .optional()
        .describe('Channel ID to list all threads related to (including video comments)'),
      parentCommentId: z.string().optional().describe('Parent comment ID to list replies for'),
      maxResults: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results (1-100)'),
      pageToken: z.string().optional().describe('Token for pagination'),
      order: z.enum(['time', 'relevance']).optional().describe('Sort order'),
      searchTerms: z.string().optional().describe('Filter by search terms'),
      moderationStatus: z
        .enum(['heldForReview', 'likelySpam', 'published'])
        .optional()
        .describe('Filter by moderation status')
    })
  )
  .output(
    z.object({
      comments: z.array(
        z.object({
          commentId: z.string(),
          threadId: z.string().optional(),
          authorName: z.string().optional(),
          authorImageUrl: z.string().optional(),
          authorChannelId: z.string().optional(),
          textDisplay: z.string().optional(),
          textOriginal: z.string().optional(),
          likeCount: z.number().optional(),
          publishedAt: z.string().optional(),
          updatedAt: z.string().optional(),
          replyCount: z.number().optional(),
          videoId: z.string().optional(),
          parentId: z.string().optional()
        })
      ),
      totalResults: z.number().optional(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);
    let filterCount = [
      ctx.input.parentCommentId,
      ctx.input.videoId,
      ctx.input.channelId,
      ctx.input.allThreadsRelatedToChannelId
    ].filter(Boolean).length;

    if (filterCount !== 1) {
      throw youtubeServiceError(
        'Provide exactly one of parentCommentId, videoId, channelId, or allThreadsRelatedToChannelId'
      );
    }

    if (ctx.input.parentCommentId) {
      let response = await client.listComments({
        part: ['snippet'],
        parentId: ctx.input.parentCommentId,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken
      });

      let comments = response.items.map(c => ({
        commentId: c.id,
        authorName: c.snippet?.authorDisplayName,
        authorImageUrl: c.snippet?.authorProfileImageUrl,
        authorChannelId: c.snippet?.authorChannelId?.value,
        textDisplay: c.snippet?.textDisplay,
        textOriginal: c.snippet?.textOriginal,
        likeCount: c.snippet?.likeCount,
        publishedAt: c.snippet?.publishedAt,
        updatedAt: c.snippet?.updatedAt,
        parentId: c.snippet?.parentId
      }));

      return {
        output: {
          comments,
          totalResults: response.pageInfo?.totalResults,
          nextPageToken: response.nextPageToken
        },
        message: `Retrieved **${comments.length}** replies.${response.nextPageToken ? ' More pages available.' : ''}`
      };
    }

    let response = await client.listCommentThreads({
      part: ['snippet', 'replies'],
      videoId: ctx.input.videoId,
      channelId: ctx.input.channelId,
      allThreadsRelatedToChannelId: ctx.input.allThreadsRelatedToChannelId,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      order: ctx.input.order,
      searchTerms: ctx.input.searchTerms,
      moderationStatus: ctx.input.moderationStatus
    });

    let comments = response.items.map(thread => {
      let topComment = thread.snippet?.topLevelComment;
      return {
        commentId: topComment?.id || thread.id,
        threadId: thread.id,
        authorName: topComment?.snippet?.authorDisplayName,
        authorImageUrl: topComment?.snippet?.authorProfileImageUrl,
        authorChannelId: topComment?.snippet?.authorChannelId?.value,
        textDisplay: topComment?.snippet?.textDisplay,
        textOriginal: topComment?.snippet?.textOriginal,
        likeCount: topComment?.snippet?.likeCount,
        publishedAt: topComment?.snippet?.publishedAt,
        updatedAt: topComment?.snippet?.updatedAt,
        replyCount: thread.snippet?.totalReplyCount,
        videoId: thread.snippet?.videoId
      };
    });

    return {
      output: {
        comments,
        totalResults: response.pageInfo?.totalResults,
        nextPageToken: response.nextPageToken
      },
      message: `Retrieved **${comments.length}** comment thread(s).${response.nextPageToken ? ' More pages available.' : ''}`
    };
  })
  .build();
