import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBrandMentions = SlateTool.create(spec, {
  name: 'Get Brand Mentions',
  key: 'get_brand_mentions',
  description: `Retrieve brand mentions data for an influencer on YouTube or TikTok. Shows which brands the creator has mentioned, with performance metrics across time periods (7d, 30d, 90d, 180d, 365d) including engagement rates, view counts, and mention frequency.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z
        .enum(['youtube', 'tiktok'])
        .describe('Social media platform (only YouTube and TikTok support brand mentions)'),
      channel: z.string().describe('Channel name or ID')
    })
  )
  .output(
    z.object({
      mentions: z
        .any()
        .optional()
        .describe('Brand mention performance data across time periods'),
      users: z.any().optional().describe('Creator profile objects referenced in mentions'),
      posts: z.any().optional().describe('Post objects with metrics from mentions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let response: any;

    if (ctx.input.platform === 'youtube') {
      response = await client.getYoutubeBrandMentions(ctx.input.channel);
    } else {
      response = await client.getTiktokBrandMentions(ctx.input.channel);
    }

    let result = response?.result ?? response;

    return {
      output: {
        mentions: result?.mentions,
        users: result?.users,
        posts: result?.posts
      },
      message: `Retrieved brand mentions for **${ctx.input.channel}** on ${ctx.input.platform}.`
    };
  })
  .build();
