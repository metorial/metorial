import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { redditServiceError } from '../lib/errors';
import { formatRedditListingItems } from '../lib/format';
import { spec } from '../spec';

let redditThingOutput = z.object({
  thingId: z.string().describe('Reddit fullname for the returned thing'),
  kind: z
    .enum(['post', 'comment', 'subreddit', 'message', 'unknown'])
    .describe('Type of Reddit thing'),
  postId: z.string().optional().describe('Post fullname when available'),
  commentId: z.string().optional().describe('Comment fullname when available'),
  subredditId: z.string().optional().describe('Subreddit fullname when available'),
  title: z.string().optional().describe('Post title, linked title, or subreddit name'),
  body: z.string().optional().describe('Comment body or post self text'),
  author: z.string().optional().describe('Author username when available'),
  subredditName: z.string().optional().describe('Subreddit display name when available'),
  score: z.number().optional().describe('Current score when available'),
  numComments: z.number().optional().describe('Number of comments for posts'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  permalink: z.string().optional().describe('Full Reddit permalink when available'),
  linkUrl: z.string().optional().describe('External link URL for link posts'),
  isNsfw: z.boolean().optional().describe('Whether the item is marked NSFW'),
  isSpoiler: z.boolean().optional().describe('Whether the post is marked as a spoiler'),
  isLocked: z.boolean().optional().describe('Whether the post or comment is locked')
});

export let getContentInfo = SlateTool.create(spec, {
  name: 'Get Content Info',
  key: 'get_content_info',
  description: `Look up Reddit posts, comments, or subreddits by fullname, Reddit URL, or subreddit name using Reddit's batch info endpoint.
Use this when you already have IDs from another workflow and need normalized metadata before acting on the content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      thingIds: z
        .array(z.string())
        .optional()
        .describe('Post, comment, or subreddit fullnames to look up, such as t3_* or t1_*'),
      url: z.string().optional().describe('Reddit URL to resolve to matching content'),
      subredditNames: z
        .array(z.string())
        .optional()
        .describe('Subreddit names to look up without the r/ prefix')
    })
  )
  .output(
    z.object({
      items: z.array(redditThingOutput).describe('Resolved Reddit things'),
      totalResults: z.number().describe('Number of resolved items'),
      after: z.string().optional().describe('Next listing cursor, when returned'),
      before: z.string().optional().describe('Previous listing cursor, when returned')
    })
  )
  .handleInvocation(async ctx => {
    let thingIds = ctx.input.thingIds?.filter(id => id.trim().length > 0) ?? [];
    let subredditNames =
      ctx.input.subredditNames?.filter(name => name.trim().length > 0) ?? [];
    let url = ctx.input.url?.trim();

    if (thingIds.length === 0 && subredditNames.length === 0 && !url) {
      throw redditServiceError(
        'Provide at least one thingId, subredditName, or URL to look up.'
      );
    }

    let client = new RedditClient(ctx.auth.token);
    let data = await client.getContentInfo({
      ids: thingIds,
      subredditNames,
      url
    });
    let items = formatRedditListingItems(data);

    return {
      output: {
        items,
        totalResults: items.length,
        after: data?.data?.after ?? undefined,
        before: data?.data?.before ?? undefined
      },
      message: `Resolved ${items.length} Reddit item(s).`
    };
  })
  .build();
