import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaignTool = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, update, or delete an auto dialer campaign. Supports setting campaign name, type, call flow, caller ID group, and status.
When creating, provide a name and optional configuration. When updating, provide the campaign ID and the fields to change. When deleting, provide the campaign ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the campaign'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Campaign name (required for create, optional for update)'),
      campaignType: z
        .string()
        .optional()
        .describe('Campaign type (e.g. "classic", "progressive", "predictive")'),
      callflowId: z
        .string()
        .optional()
        .describe('Call flow ID to associate with the campaign'),
      callerIdGroupId: z.string().optional().describe('Caller ID group ID for the campaign'),
      status: z
        .string()
        .optional()
        .describe('Campaign status (e.g. "active", "paused", "stopped")'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional campaign settings as key-value pairs')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      campaign: z.any().optional().describe('Campaign data returned from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);
    let result: any;
    let message: string = '';

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name) {
          throw new Error('Campaign name is required when creating a campaign');
        }
        result = await client.createCampaign({
          name: ctx.input.name,
          campaignType: ctx.input.campaignType,
          callflowId: ctx.input.callflowId,
          callerIdGroupId: ctx.input.callerIdGroupId,
          settings: ctx.input.settings
        });
        message = `Campaign **${ctx.input.name}** created successfully.`;
        break;
      }
      case 'update': {
        if (!ctx.input.campaignId) {
          throw new Error('Campaign ID is required when updating a campaign');
        }
        result = await client.updateCampaign(ctx.input.campaignId, {
          name: ctx.input.name,
          status: ctx.input.status,
          settings: ctx.input.settings
        });
        message = `Campaign **${ctx.input.campaignId}** updated successfully.`;
        break;
      }
      case 'delete': {
        if (!ctx.input.campaignId) {
          throw new Error('Campaign ID is required when deleting a campaign');
        }
        result = await client.deleteCampaign(ctx.input.campaignId);
        message = `Campaign **${ctx.input.campaignId}** deleted successfully.`;
        break;
      }
    }

    return {
      output: {
        success: true,
        campaign: result
      },
      message
    };
  })
  .build();
