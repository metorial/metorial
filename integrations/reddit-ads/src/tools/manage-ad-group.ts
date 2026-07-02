import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let manageAdGroup = SlateTool.create(spec, {
  name: 'Manage Ad Group',
  key: 'manage_ad_group',
  description: `Create a new ad group within a campaign or update an existing one. Configure targeting (subreddits, interests, keywords), bidding strategy, placements (Feed, Conversations), scheduling, and budget. Ad groups control how and where ads are shown within a campaign.`,
  instructions: [
    'To create an ad group, omit adGroupId and provide campaignId. To update, provide adGroupId.',
    'Bid amount is in cents (e.g., 500 = $5.00 CPM/CPC).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      adGroupId: z
        .string()
        .optional()
        .describe('Ad group ID to update; omit to create a new ad group'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID for the new ad group (required when creating)'),
      name: z.string().optional().describe('Ad group name'),
      bidCents: z.number().optional().describe('Bid amount in cents'),
      bidStrategy: z
        .enum(['CPC', 'CPM', 'CPA', 'CPV'])
        .optional()
        .describe('Bidding strategy'),
      status: z.enum(['ACTIVE', 'PAUSED']).optional().describe('Ad group status'),
      startDate: z.string().optional().describe('Start date in ISO 8601 format'),
      endDate: z.string().optional().describe('End date in ISO 8601 format'),
      targetSubreddits: z
        .array(z.string())
        .optional()
        .describe('List of subreddit names to target'),
      targetInterests: z
        .array(z.string())
        .optional()
        .describe('List of interest category IDs to target'),
      targetKeywords: z.array(z.string()).optional().describe('List of keywords to target'),
      placements: z
        .array(z.enum(['FEED', 'CONVERSATIONS']))
        .optional()
        .describe('Ad placements')
    })
  )
  .output(
    z.object({
      adGroupId: z.string().optional(),
      campaignId: z.string().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
      bidCents: z.number().optional(),
      bidStrategy: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let payload: Record<string, any> = {};
    if (ctx.input.campaignId !== undefined) payload.campaign_id = ctx.input.campaignId;
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.bidCents !== undefined) payload.bid_cents = ctx.input.bidCents;
    if (ctx.input.bidStrategy !== undefined) payload.bid_strategy = ctx.input.bidStrategy;
    if (ctx.input.status !== undefined) payload.status = ctx.input.status;
    if (ctx.input.startDate !== undefined) payload.start_date = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) payload.end_date = ctx.input.endDate;
    if (ctx.input.targetSubreddits !== undefined)
      payload.target_subreddits = ctx.input.targetSubreddits;
    if (ctx.input.targetInterests !== undefined)
      payload.target_interests = ctx.input.targetInterests;
    if (ctx.input.targetKeywords !== undefined)
      payload.target_keywords = ctx.input.targetKeywords;
    if (ctx.input.placements !== undefined) payload.placements = ctx.input.placements;

    let result: any;
    let action: string;

    if (ctx.input.adGroupId) {
      result = await client.updateAdGroup(ctx.input.adGroupId, payload);
      action = 'updated';
    } else {
      result = await client.createAdGroup(payload);
      action = 'created';
    }

    return {
      output: {
        adGroupId: result.id || result.ad_group_id,
        campaignId: result.campaign_id,
        name: result.name,
        status: result.status || result.effective_status,
        bidCents: result.bid_cents || result.bid,
        bidStrategy: result.bid_strategy,
        raw: result
      },
      message: `Ad group **${result.name || ctx.input.name}** ${action} successfully.`
    };
  })
  .build();
