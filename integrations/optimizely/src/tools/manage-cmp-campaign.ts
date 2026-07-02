import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmpClient } from '../lib/cmp-client';
import { spec } from '../spec';

export let manageCmpCampaign = SlateTool.create(spec, {
  name: 'Manage CMP Campaign',
  key: 'manage_cmp_campaign',
  description: `Create, update, retrieve, or list marketing campaigns in Optimizely Content Marketing Platform.
Campaigns are top-level containers for organizing related content tasks, briefs, and assets.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'list']).describe('Action to perform'),
      campaignId: z.string().optional().describe('Campaign ID (required for get/update)'),
      name: z.string().optional().describe('Campaign name (for create/update)'),
      description: z.string().optional().describe('Campaign description (for create/update)'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in ISO 8601 format (for create/update)'),
      endDate: z
        .string()
        .optional()
        .describe('End date in ISO 8601 format (for create/update)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values (for create/update)'),
      page: z.number().optional().describe('Page number (for list)'),
      limit: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      campaign: z.any().optional().describe('Campaign data'),
      campaigns: z.array(z.any()).optional().describe('List of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CmpClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listCampaigns({
          page: ctx.input.page,
          limit: ctx.input.limit
        });
        let campaigns = result.data || result;
        return {
          output: { campaigns: Array.isArray(campaigns) ? campaigns : [] },
          message: `Listed CMP campaigns.`
        };
      }
      case 'get': {
        if (!ctx.input.campaignId) throw new Error('campaignId is required');
        let campaign = await client.getCampaign(ctx.input.campaignId);
        return {
          output: { campaign },
          message: `Retrieved CMP campaign **${campaign.name || ctx.input.campaignId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required');
        let campaign = await client.createCampaign({
          name: ctx.input.name,
          description: ctx.input.description,
          start_date: ctx.input.startDate,
          end_date: ctx.input.endDate,
          custom_fields: ctx.input.customFields
        });
        return {
          output: { campaign },
          message: `Created CMP campaign **${campaign.name}**.`
        };
      }
      case 'update': {
        if (!ctx.input.campaignId) throw new Error('campaignId is required');
        let updateData: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
        if (ctx.input.description !== undefined)
          updateData.description = ctx.input.description;
        if (ctx.input.startDate !== undefined) updateData.start_date = ctx.input.startDate;
        if (ctx.input.endDate !== undefined) updateData.end_date = ctx.input.endDate;
        if (ctx.input.customFields !== undefined)
          updateData.custom_fields = ctx.input.customFields;
        let campaign = await client.updateCampaign(ctx.input.campaignId, updateData);
        return {
          output: { campaign },
          message: `Updated CMP campaign **${campaign.name || ctx.input.campaignId}**.`
        };
      }
    }
  })
  .build();
