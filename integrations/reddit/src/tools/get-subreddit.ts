import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { spec } from '../spec';

export let getSubreddit = SlateTool.create(spec, {
  name: 'Get Subreddit',
  key: 'get_subreddit',
  description: `Retrieve information about a subreddit including its description, subscriber count, rules, and current posts.
Use this to explore subreddit metadata, discover community rules, or browse current content sorted by hot, new, top, or controversial.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subredditName: z.string().describe('Name of the subreddit (without the r/ prefix)'),
      includeRules: z.boolean().optional().describe('Whether to include subreddit rules'),
      includePosts: z.boolean().optional().describe('Whether to include current posts'),
      postSort: z
        .enum(['hot', 'new', 'top', 'controversial', 'rising'])
        .optional()
        .describe('Sort order for posts'),
      postTimeFilter: z
        .enum(['hour', 'day', 'week', 'month', 'year', 'all'])
        .optional()
        .describe('Time filter for top/controversial posts'),
      postLimit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of posts to return (max 100)')
    })
  )
  .output(
    z.object({
      subredditId: z.string().describe('Unique subreddit ID'),
      displayName: z.string().describe('Display name of the subreddit'),
      title: z.string().optional().describe('Title of the subreddit'),
      publicDescription: z
        .string()
        .optional()
        .describe('Public description shown in search results'),
      description: z.string().optional().describe('Full sidebar description'),
      subscriberCount: z.number().optional().describe('Number of subscribers'),
      activeUserCount: z.number().optional().describe('Number of active users'),
      createdAt: z.string().optional().describe('When the subreddit was created'),
      isNsfw: z.boolean().optional().describe('Whether the subreddit is marked NSFW'),
      subredditType: z
        .string()
        .optional()
        .describe('Type of subreddit (public, private, restricted)'),
      url: z.string().optional().describe('URL path of the subreddit'),
      rules: z
        .array(
          z.object({
            shortName: z.string().describe('Rule name'),
            descriptionHtml: z.string().optional().describe('Rule description in HTML'),
            priority: z.number().optional().describe('Rule priority order')
          })
        )
        .optional()
        .describe('Subreddit rules'),
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Post fullname (t3_ prefixed ID)'),
            title: z.string().describe('Post title'),
            author: z.string().optional().describe('Post author username'),
            score: z.number().optional().describe('Post score (upvotes - downvotes)'),
            numComments: z.number().optional().describe('Number of comments'),
            createdAt: z.string().optional().describe('When the post was created'),
            permalink: z.string().optional().describe('Permalink to the post'),
            selftext: z.string().optional().describe('Self text content for text posts'),
            linkUrl: z.string().optional().describe('URL for link posts'),
            isNsfw: z.boolean().optional().describe('Whether the post is NSFW'),
            isSpoiler: z.boolean().optional().describe('Whether the post is a spoiler')
          })
        )
        .optional()
        .describe('Current posts in the subreddit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);

    let about = await client.getSubredditAbout(ctx.input.subredditName);

    let rules: any[] | undefined;
    if (ctx.input.includeRules) {
      let rulesData = await client.getSubredditRules(ctx.input.subredditName);
      rules = (rulesData.rules ?? []).map((r: any) => ({
        shortName: r.short_name,
        descriptionHtml: r.description_html,
        priority: r.priority
      }));
    }

    let posts: any[] | undefined;
    if (ctx.input.includePosts) {
      let postsData = await client.getSubredditPosts(
        ctx.input.subredditName,
        ctx.input.postSort ?? 'hot',
        {
          t: ctx.input.postTimeFilter,
          limit: ctx.input.postLimit ?? 25
        }
      );
      let children = postsData?.data?.children ?? [];
      posts = children.map((c: any) => {
        let d = c.data;
        return {
          postId: d.name,
          title: d.title,
          author: d.author,
          score: d.score,
          numComments: d.num_comments,
          createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
          permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : undefined,
          selftext: d.selftext || undefined,
          linkUrl: d.is_self ? undefined : d.url,
          isNsfw: d.over_18,
          isSpoiler: d.spoiler
        };
      });
    }

    return {
      output: {
        subredditId: about.name ?? about.id,
        displayName: about.display_name,
        title: about.title,
        publicDescription: about.public_description || undefined,
        description: about.description || undefined,
        subscriberCount: about.subscribers,
        activeUserCount: about.accounts_active,
        createdAt: about.created_utc
          ? new Date(about.created_utc * 1000).toISOString()
          : undefined,
        isNsfw: about.over18,
        subredditType: about.subreddit_type,
        url: about.url,
        rules,
        posts
      },
      message: `Retrieved information for r/${ctx.input.subredditName} (${about.subscribers?.toLocaleString() ?? 'unknown'} subscribers)${rules ? `, including ${rules.length} rules` : ''}${posts ? ` and ${posts.length} posts` : ''}.`
    };
  })
  .build();
