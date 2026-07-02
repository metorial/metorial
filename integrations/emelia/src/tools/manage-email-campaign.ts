import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageEmailCampaign = SlateTool.create(spec, {
  name: 'Manage Email Campaign',
  key: 'manage_email_campaign',
  description: `Create, retrieve, start, pause, duplicate, or delete an email campaign. Use the **action** field to specify the operation.
- **create**: Creates a new email campaign with a given name.
- **get**: Retrieves details of a specific campaign.
- **start**: Starts a paused or ready campaign (requires provider and contacts).
- **pause**: Pauses a running campaign.
- **duplicate**: Creates a copy of an existing campaign.
- **delete**: Permanently deletes a campaign.`,
  instructions: [
    'To start a campaign, ensure it has at least one email provider and contacts configured.',
    'Only running campaigns can be paused.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'start', 'pause', 'duplicate', 'delete'])
        .describe('Operation to perform'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for get, start, pause, duplicate, delete)'),
      name: z.string().optional().describe('Campaign name (required for create)')
    })
  )
  .output(
    z.object({
      campaign: z.record(z.string(), z.unknown()).optional().describe('Campaign details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { action, campaignId, name } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Campaign name is required for create action');
      let campaign = await client.createEmailCampaign({ name });
      return {
        output: { campaign, success: true },
        message: `Created email campaign **${name}**.`
      };
    }

    if (!campaignId) throw new Error('Campaign ID is required for this action');

    if (action === 'get') {
      let campaign = await client.getEmailCampaign(campaignId);
      return {
        output: { campaign, success: true },
        message: `Retrieved email campaign details.`
      };
    }

    if (action === 'start') {
      let campaign = await client.startEmailCampaign(campaignId);
      return {
        output: { campaign, success: true },
        message: `Started email campaign **${campaignId}**.`
      };
    }

    if (action === 'pause') {
      let campaign = await client.pauseEmailCampaign(campaignId);
      return {
        output: { campaign, success: true },
        message: `Paused email campaign **${campaignId}**.`
      };
    }

    if (action === 'duplicate') {
      let campaign = await client.duplicateEmailCampaign(campaignId);
      return {
        output: { campaign, success: true },
        message: `Duplicated email campaign **${campaignId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteEmailCampaign(campaignId);
      return {
        output: { success: true },
        message: `Deleted email campaign **${campaignId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
