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
  'threads',
  'tiktok',
  'twitter',
  'youtube'
]);

export let getPostAnalytics = SlateTool.create(spec, {
  name: 'Get Post Analytics',
  key: 'get_post_analytics',
  description: `Retrieve engagement analytics for a specific post across platforms. Returns metrics such as likes, comments, shares, impressions, reach, and platform-specific engagement data.`,
  instructions: [
    'Use the Ayrshare Post ID returned from creating a post.',
    'TikTok and YouTube analytics may take 24-48 hours to become available.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().describe('Ayrshare Post ID to get analytics for'),
      platforms: z
        .array(platformEnum)
        .optional()
        .describe('Filter analytics to specific platforms')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('The post ID'),
      status: z.string().optional().describe('Response status'),
      analytics: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .describe(
          'Platform-keyed analytics data with metrics like likes, comments, shares, impressions'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.getPostAnalytics({
      postId: ctx.input.postId,
      platforms: ctx.input.platforms
    });

    let platformNames = [
      'bluesky',
      'facebook',
      'instagram',
      'linkedin',
      'pinterest',
      'reddit',
      'snapchat',
      'threads',
      'tiktok',
      'twitter',
      'youtube',
      'gmb'
    ];
    let analytics: Record<string, Record<string, unknown>> = {};

    for (let platform of platformNames) {
      if (result[platform]) {
        analytics[platform] = result[platform];
      }
    }

    return {
      output: {
        postId: ctx.input.postId,
        status: result.status,
        analytics
      },
      message: `Retrieved analytics for post **${ctx.input.postId}** across **${Object.keys(analytics).length}** platform(s).`
    };
  })
  .build();
