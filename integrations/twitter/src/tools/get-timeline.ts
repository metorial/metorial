import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { mapPost, postSchema } from '../lib/helpers';
import { spec } from '../spec';

export let getTimeline = SlateTool.create(spec, {
  name: 'Get Timeline',
  key: 'get_timeline',
  description: `Retrieve a user's timeline, mentions, or home timeline. Use this to read recent posts from a specific user, posts mentioning a user, or the authenticated user's chronological home feed.`,
  instructions: [
    'For **user** timeline: returns posts authored by the specified user.',
    'For **mentions** timeline: returns posts mentioning the specified user.',
    'For **home** timeline: returns the reverse-chronological home timeline for the authenticated user.',
    'Use exclude to filter out retweets and/or replies from user and home timelines.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('User ID to get the timeline for'),
      timelineType: z
        .enum(['user', 'mentions', 'home'])
        .describe('Type of timeline to retrieve'),
      maxResults: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results (1-100, default 10)'),
      sinceId: z.string().optional().describe('Return posts after this post ID (exclusive)'),
      untilId: z.string().optional().describe('Return posts before this post ID (exclusive)'),
      startTime: z.string().optional().describe('ISO 8601 start time filter'),
      endTime: z.string().optional().describe('ISO 8601 end time filter'),
      exclude: z
        .array(z.enum(['retweets', 'replies']))
        .optional()
        .describe('Exclude retweets and/or replies'),
      paginationToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      posts: z.array(postSchema).describe('Timeline posts'),
      nextToken: z.string().optional().describe('Token for fetching the next page'),
      resultCount: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);
    let {
      userId,
      timelineType,
      maxResults,
      sinceId,
      untilId,
      startTime,
      endTime,
      exclude,
      paginationToken
    } = ctx.input;

    let result: any;
    if (timelineType === 'user') {
      result = await client.getUserTimeline(userId, {
        maxResults,
        sinceId,
        untilId,
        startTime,
        endTime,
        exclude,
        paginationToken
      });
    } else if (timelineType === 'mentions') {
      result = await client.getUserMentions(userId, {
        maxResults,
        sinceId,
        untilId,
        startTime,
        endTime,
        paginationToken
      });
    } else {
      result = await client.getReverseChronologicalTimeline(userId, {
        maxResults,
        sinceId,
        untilId,
        startTime,
        endTime,
        exclude,
        paginationToken
      });
    }

    let posts = (result.data || []).map(mapPost);
    let nextToken = result.meta?.next_token;
    let resultCount = result.meta?.result_count;

    return {
      output: { posts, nextToken, resultCount },
      message: `Retrieved **${resultCount || posts.length}** post(s) from the **${timelineType}** timeline.`
    };
  })
  .build();
