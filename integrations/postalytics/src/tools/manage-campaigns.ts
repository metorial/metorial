import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `List, retrieve, update, or delete direct mail campaigns. Supports viewing all campaigns (including drip-only), getting campaign details and stats, toggling campaign test/live mode, and deleting campaigns.`,
  instructions: [
    'Use action "list" to get all campaigns or "list_drips" for triggered drip campaigns only.',
    'Use action "get" to retrieve full campaign details.',
    'Use action "stats" to get campaign delivery and analytics statistics.',
    'Use action "update_status" to toggle test/live mode for a campaign.',
    'Use action "delete" to permanently remove a campaign.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'list_drips', 'get', 'stats', 'update_status', 'delete'])
        .describe('The action to perform'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for get, stats, update_status, delete)'),
      statusUpdate: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Status update fields for update_status action (e.g. toggle test/live mode)')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of campaigns'),
      campaign: z.record(z.string(), z.unknown()).optional().describe('Campaign details'),
      campaignStats: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campaign statistics'),
      result: z.record(z.string(), z.unknown()).optional().describe('Operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let campaigns = await client.getCampaigns();
      return {
        output: { campaigns },
        message: `Found **${campaigns.length}** campaign(s).`
      };
    }

    if (action === 'list_drips') {
      let campaigns = await client.getDripCampaigns();
      return {
        output: { campaigns },
        message: `Found **${campaigns.length}** drip campaign(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.campaignId) throw new Error('campaignId is required for get action');
      let campaign = await client.getCampaign(ctx.input.campaignId);
      return {
        output: { campaign },
        message: `Retrieved details for campaign **${campaign.name || ctx.input.campaignId}**.`
      };
    }

    if (action === 'stats') {
      if (!ctx.input.campaignId) throw new Error('campaignId is required for stats action');
      let campaignStats = await client.getCampaignStats(ctx.input.campaignId);
      return {
        output: { campaignStats },
        message: `Retrieved stats for campaign **${ctx.input.campaignId}**.`
      };
    }

    if (action === 'update_status') {
      if (!ctx.input.campaignId)
        throw new Error('campaignId is required for update_status action');
      let result = await client.updateCampaignStatus(
        ctx.input.campaignId,
        ctx.input.statusUpdate || {}
      );
      return {
        output: { result },
        message: `Campaign **${ctx.input.campaignId}** status updated.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.campaignId) throw new Error('campaignId is required for delete action');
      let result = await client.deleteCampaign(ctx.input.campaignId);
      return {
        output: { result },
        message: `Campaign **${ctx.input.campaignId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
