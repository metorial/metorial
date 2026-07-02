import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwitterClient } from '../lib/client';
import { mapPost, postSchema } from '../lib/helpers';
import { spec } from '../spec';

export let searchPosts = SlateTool.create(spec, {
  name: 'Search Posts',
  key: 'search_posts',
  description: `Search for recent posts on Twitter/X using a query. Supports Twitter's powerful search operators including keywords, hashtags, mentions, language filters, and boolean logic.`,
  instructions: [
    'Use Twitter search operators: `from:username`, `to:username`, `#hashtag`, `@mention`, `lang:en`, `is:retweet`, `has:media`, `has:links`, `-keyword` (exclude).',
    'Combine operators with AND/OR and parentheses for complex queries.',
    'Results are from the last 7 days by default (recent search).',
    'Use startTime and endTime (ISO 8601 format) to narrow the time range.'
  ],
  constraints: [
    'Recent search covers the last 7 days only.',
    'Maximum 100 results per request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query using Twitter search operators'),
      maxResults: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Number of results to return (10-100, default 10)'),
      sortOrder: z
        .enum(['recency', 'relevancy'])
        .optional()
        .describe('Sort order for results'),
      startTime: z.string().optional().describe('ISO 8601 start time for filtering results'),
      endTime: z.string().optional().describe('ISO 8601 end time for filtering results'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token for fetching next page of results')
    })
  )
  .output(
    z.object({
      posts: z.array(postSchema).describe('Matching posts'),
      nextToken: z.string().optional().describe('Token for fetching the next page'),
      resultCount: z.number().optional().describe('Total number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitterClient(ctx.auth.token);

    let result = await client.searchRecentPosts(ctx.input.query, {
      maxResults: ctx.input.maxResults,
      sortOrder: ctx.input.sortOrder,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      nextToken: ctx.input.nextToken
    });

    let posts = (result.data || []).map(mapPost);
    let nextToken = result.meta?.next_token;
    let resultCount = result.meta?.result_count;

    return {
      output: { posts, nextToken, resultCount },
      message: `Found **${resultCount || posts.length}** post(s) matching query "${ctx.input.query}".`
    };
  })
  .build();
