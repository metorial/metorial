import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, update, retrieve, cancel, or delete outbound call campaigns. Campaigns use an assistant or squad and a list of customer numbers. Use list_campaigns to discover existing campaigns.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Action to perform'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for get, update, delete)'),
      name: z.string().optional().describe('Name of the campaign'),
      assistantId: z.string().optional().describe('Assistant ID to use for campaign calls'),
      squadId: z.string().optional().describe('Squad ID to use for campaign calls'),
      status: z
        .enum(['cancelled', 'ended'])
        .optional()
        .describe('For update, mark the campaign cancelled or ended'),
      workflowId: z.string().optional().describe('Workflow ID to use for campaign calls'),
      phoneNumberId: z.string().optional().describe('Phone number ID to call from'),
      customers: z
        .array(
          z.object({
            number: z.string().optional().describe('Customer phone number in E.164 format'),
            name: z.string().optional().describe('Customer name'),
            extension: z.string().optional().describe('Phone extension')
          })
        )
        .optional()
        .describe('List of customers to call'),
      maxConcurrentCalls: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum concurrent calls (create only)'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to schedule the campaign')
    })
  )
  .output(
    z.object({
      campaignId: z.string().optional().describe('ID of the campaign'),
      name: z.string().optional().describe('Name of the campaign'),
      status: z.string().optional().describe('Campaign status'),
      assistantId: z.string().optional().describe('Assistant ID used'),
      squadId: z.string().optional().describe('Squad ID used'),
      workflowId: z.string().optional().describe('Workflow ID used'),
      phoneNumberId: z.string().optional().describe('Phone number ID used'),
      schedulePlan: z.any().optional().describe('Campaign scheduling bounds'),
      maxConcurrentCalls: z.number().optional().describe('Maximum concurrent calls'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the campaign was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, ctx.auth.region);
    let { action, campaignId } = ctx.input;
    if (['create', 'update'].includes(action)) {
      if (ctx.input.workflowId)
        throw createApiServiceError(
          'Vapi retired Workflows on August 18, 2026. Use assistantId or squadId.'
        );
      if (ctx.input.assistantId && ctx.input.squadId)
        throw createApiServiceError('Provide either assistantId or squadId, not both.');
      if (
        action === 'create' &&
        (!ctx.input.name ||
          !ctx.input.phoneNumberId ||
          !ctx.input.customers?.length ||
          !(ctx.input.assistantId || ctx.input.squadId))
      ) {
        throw createApiServiceError(
          'Creating a campaign requires name, phoneNumberId, customers, and either assistantId or squadId.'
        );
      }
      if (action === 'create' && ctx.input.customers?.some(customer => !customer.number)) {
        throw createApiServiceError('Every campaign customer must include a phone number.');
      }
      if (action === 'create' && ctx.input.status)
        throw createApiServiceError('status is supported only for update.');
      if (
        action === 'update' &&
        (ctx.input.customers !== undefined || ctx.input.maxConcurrentCalls !== undefined)
      ) {
        throw createApiServiceError(
          'The Vapi update endpoint does not accept customers or maxConcurrentCalls. Create a new campaign instead.'
        );
      }
    }

    if (action === 'get') {
      if (!campaignId) throw createApiServiceError('campaignId is required for get action');
      let campaign = await client.getCampaign(campaignId);
      return {
        output: {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          assistantId: campaign.assistantId,
          workflowId: campaign.workflowId,
          squadId: campaign.squadId,
          phoneNumberId: campaign.phoneNumberId,
          schedulePlan: campaign.schedulePlan,
          maxConcurrentCalls: campaign.maxConcurrency,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        },
        message: `Retrieved campaign **${campaign.name || campaign.id}**.`
      };
    }

    if (action === 'delete') {
      if (!campaignId) throw createApiServiceError('campaignId is required for delete action');
      await client.deleteCampaign(campaignId);
      return {
        output: { campaignId, deleted: true },
        message: `Deleted campaign **${campaignId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.assistantId) body.assistantId = ctx.input.assistantId;
    if (ctx.input.squadId) body.squadId = ctx.input.squadId;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.workflowId) body.workflowId = ctx.input.workflowId;
    if (ctx.input.phoneNumberId) body.phoneNumberId = ctx.input.phoneNumberId;
    if (ctx.input.customers) body.customers = ctx.input.customers;
    if (ctx.input.maxConcurrentCalls !== undefined)
      body.maxConcurrency = ctx.input.maxConcurrentCalls;
    if (ctx.input.scheduledAt) body.schedulePlan = { earliestAt: ctx.input.scheduledAt };

    if (action === 'create') {
      let campaign = await client.createCampaign(body);
      return {
        output: {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          assistantId: campaign.assistantId,
          workflowId: campaign.workflowId,
          squadId: campaign.squadId,
          phoneNumberId: campaign.phoneNumberId,
          schedulePlan: campaign.schedulePlan,
          maxConcurrentCalls: campaign.maxConcurrency,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        },
        message: `Created campaign **${campaign.name || campaign.id}**.`
      };
    }

    if (action === 'update') {
      if (!campaignId) throw createApiServiceError('campaignId is required for update action');
      let campaign = await client.updateCampaign(campaignId, body);
      return {
        output: {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          assistantId: campaign.assistantId,
          workflowId: campaign.workflowId,
          squadId: campaign.squadId,
          phoneNumberId: campaign.phoneNumberId,
          schedulePlan: campaign.schedulePlan,
          maxConcurrentCalls: campaign.maxConcurrency,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        },
        message: `Updated campaign **${campaign.name || campaign.id}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
