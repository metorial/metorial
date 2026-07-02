import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageLinkedInCampaign = SlateTool.create(spec, {
  name: 'Manage LinkedIn Campaign',
  key: 'manage_linkedin_campaign',
  description: `Create, retrieve, list, start, pause, or delete a LinkedIn outreach campaign.
- **list**: List all LinkedIn campaigns.
- **create**: Create a new LinkedIn campaign.
- **get**: Get details of a specific LinkedIn campaign.
- **start**: Start a LinkedIn campaign.
- **pause**: Pause a running LinkedIn campaign.
- **delete**: Delete a LinkedIn campaign.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'start', 'pause', 'delete'])
        .describe('Operation to perform'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for get, start, pause, delete)'),
      name: z.string().optional().describe('Campaign name (required for create)')
    })
  )
  .output(
    z.object({
      campaign: z.record(z.string(), z.unknown()).optional().describe('Campaign details'),
      campaigns: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of campaigns (for list)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { action, campaignId, name } = ctx.input;

    if (action === 'list') {
      let campaigns = await client.listLinkedInCampaigns();
      let campaignList = Array.isArray(campaigns) ? campaigns : [];
      return {
        output: { campaigns: campaignList, success: true },
        message: `Retrieved **${campaignList.length}** LinkedIn campaign(s).`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('Campaign name is required for create action');
      let campaign = await client.createLinkedInCampaign({ name });
      return {
        output: { campaign, success: true },
        message: `Created LinkedIn campaign **${name}**.`
      };
    }

    if (!campaignId) throw new Error('Campaign ID is required for this action');

    if (action === 'get') {
      let campaign = await client.getLinkedInCampaign(campaignId);
      return {
        output: { campaign, success: true },
        message: `Retrieved LinkedIn campaign details.`
      };
    }

    if (action === 'start') {
      let campaign = await client.startLinkedInCampaign(campaignId);
      return {
        output: { campaign, success: true },
        message: `Started LinkedIn campaign **${campaignId}**.`
      };
    }

    if (action === 'pause') {
      let campaign = await client.pauseLinkedInCampaign(campaignId);
      return {
        output: { campaign, success: true },
        message: `Paused LinkedIn campaign **${campaignId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteLinkedInCampaign(campaignId);
      return {
        output: { success: true },
        message: `Deleted LinkedIn campaign **${campaignId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
