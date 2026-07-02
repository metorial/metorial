import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { mapPost, postSchema } from '../lib/helpers';
import { spec } from '../spec';

export let newPostFromSearch = SlateTrigger.create(spec, {
  name: 'New Post from Search',
  key: 'new_post_from_search',
  description:
    'Triggers when a new post matches a search query. Use Twitter search operators to monitor keywords, hashtags, mentions, or specific users.'
})
  .input(
    z.object({
      postId: z.string().describe('ID of the matching post'),
      text: z.string().describe('Text of the matching post'),
      authorId: z.string().optional().describe('User ID of the post author'),
      conversationId: z.string().optional().describe('Conversation thread ID'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp'),
      lang: z.string().optional().describe('Language code'),
      inReplyToUserId: z.string().optional().describe('User ID being replied to'),
      likeCount: z.number().optional().describe('Number of likes'),
      retweetCount: z.number().optional().describe('Number of retweets'),
      replyCount: z.number().optional().describe('Number of replies'),
      quoteCount: z.number().optional().describe('Number of quote tweets')
    })
  )
  .output(postSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TwitterClient(ctx.auth.token);
      let query = ctx.state?.query || '#twitter';

      let params: { maxResults?: number; sinceId?: string; sortOrder?: string } = {
        maxResults: 20,
        sortOrder: 'recency'
      };

      if (ctx.state?.lastSeenId) {
        params.sinceId = ctx.state.lastSeenId;
      }

      let result = await client.searchRecentPosts(query, params);
      let posts = result.data || [];

      let newestId = posts.length > 0 ? posts[0].id : ctx.state?.lastSeenId;

      let inputs = posts.map((post: any) => {
        let mapped = mapPost(post);
        return {
          postId: mapped.postId,
          text: mapped.text,
          authorId: mapped.authorId,
          conversationId: mapped.conversationId,
          createdAt: mapped.createdAt,
          lang: mapped.lang,
          inReplyToUserId: mapped.inReplyToUserId,
          likeCount: mapped.likeCount,
          retweetCount: mapped.retweetCount,
          replyCount: mapped.replyCount,
          quoteCount: mapped.quoteCount
        };
      });

      return {
        inputs,
        updatedState: {
          lastSeenId: newestId,
          query
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'post.matched',
        id: ctx.input.postId,
        output: {
          postId: ctx.input.postId,
          text: ctx.input.text,
          authorId: ctx.input.authorId,
          conversationId: ctx.input.conversationId,
          createdAt: ctx.input.createdAt,
          lang: ctx.input.lang,
          inReplyToUserId: ctx.input.inReplyToUserId,
          likeCount: ctx.input.likeCount,
          retweetCount: ctx.input.retweetCount,
          replyCount: ctx.input.replyCount,
          quoteCount: ctx.input.quoteCount
        }
      };
    }
  })
  .build();
