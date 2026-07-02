import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { spec } from '../spec';

export let getPost = SlateTool.create(spec, {
  name: 'Get Post',
  key: 'get_post',
  description: `Retrieve a specific Reddit post with its comments. Returns the post details and a tree of comments sorted by the specified order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('Post ID or fullname (e.g. "abc123" or "t3_abc123")'),
      commentSort: z
        .enum(['confidence', 'top', 'new', 'controversial', 'old', 'qa'])
        .optional()
        .describe('Sort order for comments'),
      commentLimit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of top-level comments to return (max 100)'),
      commentDepth: z.number().int().min(0).optional().describe('Maximum comment thread depth')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Post fullname'),
      title: z.string().describe('Post title'),
      author: z.string().optional().describe('Post author username'),
      subredditName: z.string().optional().describe('Subreddit name'),
      selftext: z.string().optional().describe('Self text content for text posts'),
      linkUrl: z.string().optional().describe('URL for link posts'),
      score: z.number().optional().describe('Post score'),
      upvoteRatio: z.number().optional().describe('Ratio of upvotes to total votes'),
      numComments: z.number().optional().describe('Total number of comments'),
      createdAt: z.string().optional().describe('Post creation timestamp'),
      permalink: z.string().optional().describe('Permalink URL'),
      isNsfw: z.boolean().optional().describe('Whether the post is NSFW'),
      isSpoiler: z.boolean().optional().describe('Whether the post is a spoiler'),
      isLocked: z.boolean().optional().describe('Whether the post is locked'),
      flairText: z.string().optional().describe('Post flair text'),
      comments: z
        .array(
          z.object({
            commentId: z.string().describe('Comment fullname'),
            author: z.string().optional().describe('Comment author'),
            body: z.string().optional().describe('Comment text'),
            score: z.number().optional().describe('Comment score'),
            createdAt: z.string().optional().describe('Comment timestamp'),
            isOp: z.boolean().optional().describe('Whether the commenter is the post author'),
            depth: z.number().optional().describe('Nesting depth of the comment')
          })
        )
        .optional()
        .describe('Top-level comments on the post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);

    let data = await client.getComments(ctx.input.postId, {
      sort: ctx.input.commentSort,
      limit: ctx.input.commentLimit,
      depth: ctx.input.commentDepth
    });

    let postListing = Array.isArray(data) ? data[0] : data;
    let commentListing = Array.isArray(data) ? data[1] : null;

    let post = postListing?.data?.children?.[0]?.data;
    if (!post) {
      return {
        output: {
          postId: ctx.input.postId,
          title: 'Unknown',
          comments: []
        },
        message: `Could not find post \`${ctx.input.postId}\`.`
      };
    }

    let comments: any[] = [];
    if (commentListing?.data?.children) {
      comments = commentListing.data.children
        .filter((c: any) => c.kind === 't1')
        .map((c: any) => {
          let d = c.data;
          return {
            commentId: d.name,
            author: d.author,
            body: d.body,
            score: d.score,
            createdAt: d.created_utc
              ? new Date(d.created_utc * 1000).toISOString()
              : undefined,
            isOp: d.is_submitter,
            depth: d.depth
          };
        });
    }

    return {
      output: {
        postId: post.name,
        title: post.title,
        author: post.author,
        subredditName: post.subreddit,
        selftext: post.selftext || undefined,
        linkUrl: post.is_self ? undefined : post.url,
        score: post.score,
        upvoteRatio: post.upvote_ratio,
        numComments: post.num_comments,
        createdAt: post.created_utc
          ? new Date(post.created_utc * 1000).toISOString()
          : undefined,
        permalink: post.permalink ? `https://www.reddit.com${post.permalink}` : undefined,
        isNsfw: post.over_18,
        isSpoiler: post.spoiler,
        isLocked: post.locked,
        flairText: post.link_flair_text || undefined,
        comments
      },
      message: `Retrieved post "${post.title}" by u/${post.author} in r/${post.subreddit} with ${comments.length} comments.`
    };
  })
  .build();
