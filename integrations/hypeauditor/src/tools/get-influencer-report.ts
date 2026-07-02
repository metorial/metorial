import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInfluencerReport = SlateTool.create(spec, {
  name: 'Get Influencer Report',
  key: 'get_influencer_report',
  description: `Retrieve a comprehensive analytics report for an influencer on any supported platform (Instagram, YouTube, TikTok, Twitter/X, Twitch, Snapchat). Returns profile info, engagement metrics, audience demographics, quality scores, brand safety, pricing estimates, and more.`,
  instructions: [
    'For Instagram, you can look up by username or user ID. For other platforms, use the channel name/ID.',
    'Reports may take time to generate. If the report state is NOT_READY, retry after a short delay.',
    'Instagram reports support additional features: ranking, mentions, mentioned_by, notable_audience, audience_brand_affinity, er_benchmarks.',
    'YouTube reports support additional features: blogger_mentions_performance.'
  ],
  constraints: [
    'Each report request consumes 1 credit (refunded if the report cannot be built).',
    'Instagram accounts must have 1000+ followers, not be private, and have at least 1 post.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z
        .enum(['instagram', 'youtube', 'tiktok', 'twitter', 'twitch', 'snapchat'])
        .describe('Social media platform'),
      username: z
        .string()
        .optional()
        .describe('Username or channel name/ID of the influencer'),
      userId: z
        .string()
        .optional()
        .describe(
          'Platform-specific user ID (supported for Instagram and TikTok as an alternative to username)'
        ),
      features: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of extra features to include. Instagram: ranking, mentions, mentioned_by, notable_audience, audience_brand_affinity, er_benchmarks. YouTube: blogger_mentions_performance.'
        )
    })
  )
  .output(
    z.object({
      reportState: z
        .string()
        .optional()
        .describe('Report state: READY, READY_LOW_CONFIDENCE, or NOT_READY'),
      retryTtl: z
        .number()
        .optional()
        .describe('Seconds to wait before retrying if report is generating'),
      report: z
        .any()
        .describe(
          'Full report data including profile, metrics, audience demographics, engagement, pricing, brand safety, etc.'
        ),
      remainingCredits: z.number().optional().describe('Remaining report credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let { platform, username, userId, features } = ctx.input;

    if (!username && !userId) {
      throw new Error('Either username or userId must be provided');
    }

    let response: any;

    switch (platform) {
      case 'instagram':
        if (userId) {
          response = await client.getInstagramReportByUserId(userId, features);
        } else {
          response = await client.getInstagramReport(username!, features);
        }
        break;
      case 'youtube':
        response = await client.getYoutubeReport(username ?? userId!, features);
        break;
      case 'tiktok':
        if (userId) {
          response = await client.getTiktokReportByUserId(userId);
        } else {
          response = await client.getTiktokReport(username!);
        }
        break;
      case 'twitter':
        response = await client.getTwitterReport(username ?? userId!);
        break;
      case 'twitch':
        response = await client.getTwitchReport(username ?? userId!);
        break;
      case 'snapchat':
        response = await client.getSnapchatReport(username ?? userId!);
        break;
    }

    let result = response?.result;

    if (result?.retryTtl) {
      return {
        output: {
          reportState: 'NOT_READY',
          retryTtl: result.retryTtl,
          report: null,
          remainingCredits: result.restTokens
        },
        message: `Report is still generating. Retry in **${result.retryTtl}** seconds.`
      };
    }

    let reportState = result?.report_state ?? result?.report?.basic?.report_state ?? 'READY';

    return {
      output: {
        reportState,
        retryTtl: undefined,
        report: result,
        remainingCredits: result?.restTokens
      },
      message: `Retrieved **${platform}** report for **${username ?? userId}** (state: ${reportState}).`
    };
  })
  .build();
