import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a Reddit user's public profile information, including karma, account age, and optionally their recent posts or comments.
Use without a username to get the authenticated user's own profile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe(
          'Reddit username (without u/ prefix). Leave empty to get the authenticated user.'
        ),
      includePosts: z.boolean().optional().describe("Include the user's recent posts"),
      includeComments: z.boolean().optional().describe("Include the user's recent comments"),
      sort: z
        .enum(['hot', 'new', 'top', 'controversial'])
        .optional()
        .describe('Sort order for posts/comments'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of posts/comments to return (max 100)')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('User ID'),
      username: z.string().describe('Reddit username'),
      linkKarma: z.number().optional().describe('Link/post karma'),
      commentKarma: z.number().optional().describe('Comment karma'),
      totalKarma: z.number().optional().describe('Total karma'),
      createdAt: z.string().optional().describe('When the account was created'),
      iconUrl: z.string().optional().describe('User avatar URL'),
      isGold: z.boolean().optional().describe('Whether the user has Reddit Gold'),
      isMod: z
        .boolean()
        .optional()
        .describe('Whether the user is a moderator of any subreddit'),
      isVerified: z.boolean().optional().describe('Whether the user is verified'),
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Post fullname'),
            title: z.string().describe('Post title'),
            subredditName: z.string().optional().describe('Subreddit name'),
            score: z.number().optional().describe('Post score'),
            numComments: z.number().optional().describe('Number of comments'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            permalink: z.string().optional().describe('Permalink URL')
          })
        )
        .optional()
        .describe("User's recent posts"),
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Comment fullname'),
            body: z.string().describe('Comment text'),
            subredditName: z.string().optional().describe('Subreddit name'),
            score: z.number().optional().describe('Comment score'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            permalink: z.string().optional().describe('Permalink URL')
          })
        )
        .optional()
        .describe("User's recent comments")
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);

    let user: any;
    let username: string;

    if (ctx.input.username) {
      user = await client.getUserAbout(ctx.input.username);
      username = ctx.input.username;
    } else {
      user = await client.getMe();
      username = user.name;
    }

    let posts: any[] | undefined;
    if (ctx.input.includePosts) {
      let postsData = await client.getUserPosts(username, {
        sort: ctx.input.sort,
        limit: ctx.input.limit ?? 10
      });
      let children = postsData?.data?.children ?? [];
      posts = children.map((c: any) => {
        let d = c.data;
        return {
          postId: d.name,
          title: d.title,
          subredditName: d.subreddit,
          score: d.score,
          numComments: d.num_comments,
          createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
          permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : undefined
        };
      });
    }

    let comments: any[] | undefined;
    if (ctx.input.includeComments) {
      let commentsData = await client.getUserComments(username, {
        sort: ctx.input.sort,
        limit: ctx.input.limit ?? 10
      });
      let children = commentsData?.data?.children ?? [];
      comments = children.map((c: any) => {
        let d = c.data;
        return {
          commentId: d.name,
          body: d.body,
          subredditName: d.subreddit,
          score: d.score,
          createdAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : undefined,
          permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : undefined
        };
      });
    }

    return {
      output: {
        userId: user.id,
        username: user.name,
        linkKarma: user.link_karma,
        commentKarma: user.comment_karma,
        totalKarma: user.total_karma,
        createdAt: user.created_utc
          ? new Date(user.created_utc * 1000).toISOString()
          : undefined,
        iconUrl: (user.icon_img?.split('?')[0] ?? user.snoovatar_img) || undefined,
        isGold: user.is_gold,
        isMod: user.is_mod,
        isVerified: user.verified,
        posts,
        comments
      },
      message: `Retrieved profile for u/${username} (${(user.total_karma ?? (user.link_karma ?? 0) + (user.comment_karma ?? 0)).toLocaleString()} karma)${posts ? `, ${posts.length} posts` : ''}${comments ? `, ${comments.length} comments` : ''}.`
    };
  })
  .build();
