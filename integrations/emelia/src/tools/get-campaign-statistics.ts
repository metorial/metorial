import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStatistics = SlateTool.create(spec, {
  name: 'Get Campaign Statistics',
  key: 'get_campaign_statistics',
  description: `Retrieve statistics and activity logs for an email, LinkedIn, or advanced campaign. Returns metrics like opens, clicks, replies, and recent activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      campaignType: z.enum(['email', 'linkedin', 'advanced']).describe('Type of campaign'),
      includeActivities: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch activity logs')
    })
  )
  .output(
    z.object({
      statistics: z
        .record(z.string(), z.unknown())
        .describe('Campaign statistics (opens, clicks, replies, etc.)'),
      activities: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Recent campaign activities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { campaignId, campaignType, includeActivities } = ctx.input;

    let statistics: Record<string, unknown>;
    let activities: Record<string, unknown>[] | undefined;

    if (campaignType === 'email') {
      statistics = await client.getEmailCampaignStatistics(campaignId);
      if (includeActivities) {
        activities = await client.getEmailCampaignActivities(campaignId);
      }
    } else if (campaignType === 'linkedin') {
      statistics = await client.getLinkedInCampaignStatistics(campaignId);
      if (includeActivities) {
        activities = await client.getLinkedInCampaignActivities(campaignId);
      }
    } else {
      statistics = await client.getAdvancedCampaignStatistics(campaignId);
      if (includeActivities) {
        activities = await client.getAdvancedCampaignActivities(campaignId);
      }
    }

    return {
      output: { statistics, activities },
      message: `Retrieved **${campaignType}** campaign statistics for **${campaignId}**.`
    };
  })
  .build();
