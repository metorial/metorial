import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let socialNetworkSchema = z.object({
  networkType: z.string().describe('Social network platform type'),
  title: z.string().optional().describe('Display name on the platform'),
  socialId: z.string().optional().describe('Platform-specific user ID'),
  username: z.string().optional().describe('Username on the platform'),
  avatarUrl: z.string().optional().describe('Avatar URL'),
  subscribersCount: z.number().optional().describe('Follower/subscriber count'),
  engagementRate: z.number().optional().describe('Engagement rate'),
  state: z
    .string()
    .optional()
    .describe('Report state: READY, NOT_READY, PRIVATE, DELETED, etc.')
});

export let searchInfluencers = SlateTool.create(spec, {
  name: 'Search Influencers',
  key: 'search_influencers',
  description: `Search for influencers by name or username across Instagram, YouTube, TikTok, Twitter/X, Twitch, and Snapchat. Useful for quickly looking up specific creators and finding their profiles across platforms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search term - influencer name or username'),
      socialNetwork: z
        .enum(['instagram', 'youtube', 'twitter', 'tiktok', 'twitch', 'snapchat'])
        .optional()
        .describe('Filter results to a specific social network'),
      excludeNetworks: z
        .string()
        .optional()
        .describe('Comma-separated social networks to exclude from results')
    })
  )
  .output(
    z.object({
      influencers: z.array(
        z.object({
          title: z.string().optional().describe('Display name'),
          avatarUrl: z.string().optional().describe('Profile picture URL'),
          subscribersCount: z.number().optional().describe('Follower/subscriber count'),
          isPrivate: z.boolean().optional().describe('Whether the account is private'),
          isVerified: z.boolean().optional().describe('Whether the account is verified'),
          username: z.string().optional().describe('Username'),
          networkType: z.string().optional().describe('Primary social network type'),
          linkedNetworks: z
            .array(socialNetworkSchema)
            .optional()
            .describe('Linked social network accounts')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let response = await client.searchInfluencers(ctx.input.query, {
      socialNetwork: ctx.input.socialNetwork,
      excludeNetworks: ctx.input.excludeNetworks
    });

    let list = response?.result?.list ?? [];

    let influencers = list.map((item: any) => ({
      title: item.title,
      avatarUrl: item.avatar_url,
      subscribersCount: item.subscribers_count,
      isPrivate: item.is_private,
      isVerified: item.is_verified,
      username: item.username,
      networkType: item.type,
      linkedNetworks: (item.social_networks ?? []).map((sn: any) => ({
        networkType: sn.type,
        title: sn.title,
        socialId: sn.social_id,
        username: sn.username,
        avatarUrl: sn.avatar_url,
        subscribersCount: sn.subscribers_count,
        engagementRate: sn.er,
        state: sn.state
      }))
    }));

    return {
      output: { influencers },
      message: `Found **${influencers.length}** influencer(s) matching "${ctx.input.query}".`
    };
  })
  .build();
