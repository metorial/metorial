import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaignTool = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, update, or delete an auto dialer campaign. Supports setting campaign name, type, call flow, caller ID group, and status.
When creating, provide a name, campaignType, and callerIds (or equivalent provider fields in settings). When updating, provide the campaign ID and the fields to change. When deleting, provide the campaign ID.`,
  constraints: [
    'callflowId, callerIdGroupId, and status remain available for existing calls but are not defined as write fields by the current TelTel API specification. Their upstream support is unverified.'
  ],
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
        .describe('Campaign type accepted by TelTel (for example PREDICTIVE or CALLFLOW)'),
      callflowId: z
        .string()
        .optional()
        .describe('Call flow ID to associate with the campaign'),
      callerIdGroupId: z.string().optional().describe('Caller ID group ID for the campaign'),
      callerIds: z
        .array(z.string())
        .optional()
        .describe(
          'Caller ID phone numbers. Required for create unless settings contains caller_id.'
        ),
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
          throw createApiServiceError('Campaign name is required when creating a campaign');
        }
        result = await client.createCampaign({
          name: ctx.input.name,
          campaignType: ctx.input.campaignType,
          callflowId: ctx.input.callflowId,
          callerIdGroupId: ctx.input.callerIdGroupId,
          callerIds: ctx.input.callerIds,
          settings: ctx.input.settings
        });
        message = `Campaign **${ctx.input.name}** created successfully.`;
        break;
      }
      case 'update': {
        if (!ctx.input.campaignId) {
          throw createApiServiceError('Campaign ID is required when updating a campaign');
        }
        result = await client.updateCampaign(ctx.input.campaignId, {
          name: ctx.input.name,
          status: ctx.input.status,
          callerIds: ctx.input.callerIds,
          settings: ctx.input.settings
        });
        message = `Campaign **${ctx.input.campaignId}** updated successfully.`;
        break;
      }
      case 'delete': {
        if (!ctx.input.campaignId) {
          throw createApiServiceError('Campaign ID is required when deleting a campaign');
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
