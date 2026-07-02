import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { spec } from '../spec';

export let searchReddit = SlateTool.create(spec, {
  name: 'Search Reddit',
  key: 'search_reddit',
  description: `Search across Reddit for posts matching specific keywords. Optionally restrict the search to a specific subreddit.
Also supports searching for subreddits themselves by name or topic.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      subredditName: z.string().optional().describe('Restrict search to a specific subreddit'),
      searchType: z
        .enum(['posts', 'subreddits'])
        .optional()
        .describe('Type of search to perform. Defaults to posts.'),
      sort: z
        .enum(['relevance', 'hot', 'top', 'new', 'comments'])
        .optional()
        .describe('Sort order for results'),
      timeFilter: z
        .enum(['hour', 'day', 'week', 'month', 'year', 'all'])
        .optional()
        .describe('Time filter for results'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results to return (max 100)')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Post fullname'),
            title: z.string().describe('Post title'),
            author: z.string().optional().describe('Post author'),
            subredditName: z.string().optional().describe('Subreddit name'),
            score: z.number().optional().describe('Post score'),
            numComments: z.number().optional().describe('Number of comments'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            permalink: z.string().optional().describe('Permalink URL'),
            selftext: z.string().optional().describe('Self text for text posts'),
            linkUrl: z.string().optional().describe('URL for link posts'),
            isNsfw: z.boolean().optional().describe('Whether the post is NSFW')
          })
        )
        .optional()
        .describe('Matching posts'),
      subreddits: z
        .array(
          z.object({
            subredditId: z.string().describe('Subreddit fullname'),
            displayName: z.string().describe('Display name'),
            title: z.string().optional().describe('Subreddit title'),
            publicDescription: z.string().optional().describe('Public description'),
            subscriberCount: z.number().optional().describe('Subscriber count'),
            isNsfw: z.boolean().optional().describe('Whether the subreddit is NSFW')
          })
        )
        .optional()
        .describe('Matching subreddits'),
      totalResults: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);

    if (ctx.input.searchType === 'subreddits') {
      let data = await client.searchSubreddits(ctx.input.query, {
        limit: ctx.input.limit ?? 25
      });
      let children = data?.data?.children ?? [];
      let subreddits = children.map((c: any) => {
        let d = c.data;
        return {
          subredditId: d.name,
          displayName: d.display_name,
          title: d.title,
          publicDescription: d.public_description || undefined,
          subscriberCount: d.subscribers,
          isNsfw: d.over18
        };
      });

      return {
        output: {
          subreddits,
          totalResults: subreddits.length
        },
        message: `Found ${subreddits.length} subreddits matching "${ctx.input.query}".`
      };
    }

    let data = await client.search({
      q: ctx.input.query,
      subreddit: ctx.input.subredditName,
      sort: ctx.input.sort,
      t: ctx.input.timeFilter,
      limit: ctx.input.limit ?? 25
    });

    let children = data?.data?.children ?? [];
    let posts = children.map((c: any) => {
      let d = c.data;
      return {
        postId: d.name,
        title: d.title,
        author: d.author,
        subredditName: d.subreddit,
        score: d.score,
        numComments: d.num_comments,
        createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
        permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : undefined,
        selftext: d.selftext || undefined,
        linkUrl: d.is_self ? undefined : d.url,
        isNsfw: d.over_18
      };
    });

    return {
      output: {
        posts,
        totalResults: posts.length
      },
      message: `Found ${posts.length} posts matching "${ctx.input.query}"${ctx.input.subredditName ? ` in r/${ctx.input.subredditName}` : ''}.`
    };
  })
  .build();
