import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RedditClient } from '../lib/client';
import { requireRedditInput } from '../lib/errors';
import { spec } from '../spec';

export let manageSubscriptions = SlateTool.create(spec, {
  name: 'Manage Subscriptions',
  key: 'manage_subscriptions',
  description: `Subscribe or unsubscribe from subreddits, or list the authenticated user's current subscriptions and moderated subreddits.`
})
  .input(
    z.object({
      action: z
        .enum(['subscribe', 'unsubscribe', 'list', 'list_moderated'])
        .describe('Action to perform'),
      subredditName: z
        .string()
        .optional()
        .describe('Subreddit name for subscribe/unsubscribe (without r/ prefix)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of subreddits to return when listing (max 100)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      subreddits: z
        .array(
          z.object({
            subredditId: z.string().describe('Subreddit fullname'),
            displayName: z.string().describe('Subreddit display name'),
            title: z.string().optional().describe('Subreddit title'),
            subscriberCount: z.number().optional().describe('Number of subscribers'),
            url: z.string().optional().describe('Subreddit URL path')
          })
        )
        .optional()
        .describe('List of subreddits (for list actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditClient(ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'subscribe') {
      let subredditName = requireRedditInput(
        ctx.input.subredditName,
        'subredditName is required for subscribe action'
      );
      await client.subscribe(subredditName);
      return {
        output: { success: true },
        message: `Subscribed to r/${subredditName}.`
      };
    }

    if (action === 'unsubscribe') {
      let subredditName = requireRedditInput(
        ctx.input.subredditName,
        'subredditName is required for unsubscribe action'
      );
      await client.unsubscribe(subredditName);
      return {
        output: { success: true },
        message: `Unsubscribed from r/${subredditName}.`
      };
    }

    let data: any;
    if (action === 'list_moderated') {
      data = await client.getMyModeratedSubreddits({ limit: ctx.input.limit ?? 100 });
    } else {
      data = await client.getMySubreddits({ limit: ctx.input.limit ?? 100 });
    }

    let children = data?.data?.children ?? [];
    let subreddits = children.map((c: any) => {
      let d = c.data;
      return {
        subredditId: d.name,
        displayName: d.display_name,
        title: d.title,
        subscriberCount: d.subscribers,
        url: d.url
      };
    });

    return {
      output: {
        success: true,
        subreddits
      },
      message: `Found ${subreddits.length} ${action === 'list_moderated' ? 'moderated' : 'subscribed'} subreddits.`
    };
  })
  .build();
