import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { redditServiceError } from '../lib/errors';
import { formatRedditListingItems } from '../lib/format';
import { spec } from '../spec';

let userContentItemOutput = z.object({
  thingId: z.string().describe('Reddit fullname for the returned item'),
  kind: z
    .enum(['post', 'comment', 'subreddit', 'message', 'unknown'])
    .describe('Type of Reddit thing'),
  postId: z.string().optional().describe('Post fullname when available'),
  commentId: z.string().optional().describe('Comment fullname when available'),
  subredditId: z.string().optional().describe('Subreddit fullname when available'),
  title: z.string().optional().describe('Post title or linked post title'),
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

export let listUserContent = SlateTool.create(spec, {
  name: 'List User Content',
  key: 'list_user_content',
  description: `List a Reddit user's overview, posts, comments, saved items, hidden items, voted items, or gilded items.
Use this for account history workflows that need saved/hidden/voted listings rather than only public profile metadata. Saved, hidden, upvoted, and downvoted listings are only available for the authenticated account.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z
        .string()
        .optional()
        .describe('Reddit username without u/. Leave empty to use the authenticated account.'),
      listing: z
        .enum([
          'overview',
          'submitted',
          'comments',
          'saved',
          'hidden',
          'upvoted',
          'downvoted',
          'gilded'
        ])
        .optional()
        .describe('User listing to retrieve. Defaults to overview.'),
      sort: z
        .enum(['hot', 'new', 'top', 'controversial'])
        .optional()
        .describe('Sort order for listings that support sorting'),
      timeFilter: z
        .enum(['hour', 'day', 'week', 'month', 'year', 'all'])
        .optional()
        .describe('Time filter for top or controversial listings'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of items to return (max 100)'),
      after: z.string().optional().describe('Listing cursor for the next page'),
      before: z.string().optional().describe('Listing cursor for the previous page')
    })
  )
  .output(
    z.object({
      username: z.string().describe('Username whose listing was returned'),
      listing: z.string().describe('Listing that was retrieved'),
      items: z.array(userContentItemOutput).describe('User listing items'),
      totalResults: z.number().describe('Number of items returned'),
      after: z.string().optional().describe('Next listing cursor, when returned'),
      before: z.string().optional().describe('Previous listing cursor, when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);
    let username = ctx.input.username?.trim() ?? '';
    let listing = ctx.input.listing ?? 'overview';
    let authenticatedUser: string | undefined;
    let privateListings = new Set(['saved', 'hidden', 'upvoted', 'downvoted']);

    if (!username || privateListings.has(listing)) {
      let me = await client.getMe();
      authenticatedUser = typeof me.name === 'string' ? me.name : undefined;
    }

    if (!username) {
      username = authenticatedUser ?? '';
    }

    if (!username) {
      throw redditServiceError('Could not determine the Reddit username to list.');
    }

    if (
      privateListings.has(listing) &&
      (!authenticatedUser || username.toLowerCase() !== authenticatedUser.toLowerCase())
    ) {
      throw redditServiceError(
        `${listing} listings are only available for the authenticated Reddit account.`
      );
    }

    let data = await client.getUserListing(username, listing, {
      sort: ctx.input.sort,
      t: ctx.input.timeFilter,
      limit: ctx.input.limit ?? 25,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let items = formatRedditListingItems(data);

    return {
      output: {
        username,
        listing,
        items,
        totalResults: items.length,
        after: data?.data?.after ?? undefined,
        before: data?.data?.before ?? undefined
      },
      message: `Retrieved ${items.length} item(s) from u/${username}'s ${listing} listing.`
    };
  })
  .build();
