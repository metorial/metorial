import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let platformEnum = z.enum([
  'bluesky',
  'facebook',
  'gmb',
  'instagram',
  'linkedin',
  'pinterest',
  'reddit',
  'snapchat',
  'telegram',
  'threads',
  'tiktok',
  'twitter',
  'youtube'
]);

export let addFeed = SlateTool.create(spec, {
  name: 'Add RSS Feed',
  key: 'add_feed',
  description: `Subscribe to an RSS feed to automatically post new items to social networks. New feed items are detected and published to the specified platforms.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('RSS feed URL to subscribe to'),
      platforms: z
        .array(platformEnum)
        .min(1)
        .describe('Platforms to auto-publish feed items to'),
      autoHashtag: z.boolean().optional().describe('Auto-generate hashtags for feed posts'),
      shortenLinks: z.boolean().optional().describe('Shorten links in feed posts')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Feed subscription status'),
      feedId: z.string().optional().describe('Feed subscription ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.addFeed({
      url: ctx.input.url,
      platforms: ctx.input.platforms,
      autoHashtag: ctx.input.autoHashtag,
      shortenLinks: ctx.input.shortenLinks
    });

    return {
      output: {
        status: result.status || 'success',
        feedId: result.id
      },
      message: `RSS feed subscribed: **${ctx.input.url}** → **${ctx.input.platforms.join(', ')}**.`
    };
  })
  .build();

export let getFeeds = SlateTool.create(spec, {
  name: 'Get RSS Feeds',
  key: 'get_feeds',
  description: `List all RSS feed subscriptions configured for the account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      feeds: z.array(z.record(z.string(), z.unknown())).describe('List of feed subscriptions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.getFeeds();
    let feeds = Array.isArray(result) ? result : result.feeds || [];

    return {
      output: {
        feeds
      },
      message: `Retrieved **${feeds.length}** RSS feed subscription(s).`
    };
  })
  .build();

export let deleteFeed = SlateTool.create(spec, {
  name: 'Delete RSS Feed',
  key: 'delete_feed',
  description: `Remove an RSS feed subscription to stop auto-publishing from that feed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      feedId: z.string().describe('ID of the feed subscription to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.deleteFeed({
      feedId: ctx.input.feedId
    });

    return {
      output: {
        status: result.status || 'success'
      },
      message: `RSS feed **${ctx.input.feedId}** deleted.`
    };
  })
  .build();
