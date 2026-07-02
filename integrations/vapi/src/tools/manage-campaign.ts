import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, update, retrieve, or delete outbound call campaigns for bulk calling. Campaigns link to an assistant or workflow and target a list of customers.`,
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
      maxConcurrentCalls: z.number().optional().describe('Maximum concurrent calls'),
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
      workflowId: z.string().optional().describe('Workflow ID used'),
      phoneNumberId: z.string().optional().describe('Phone number ID used'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the campaign was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, campaignId } = ctx.input;

    if (action === 'get') {
      if (!campaignId) throw new Error('campaignId is required for get action');
      let campaign = await client.getCampaign(campaignId);
      return {
        output: {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          assistantId: campaign.assistantId,
          workflowId: campaign.workflowId,
          phoneNumberId: campaign.phoneNumberId,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        },
        message: `Retrieved campaign **${campaign.name || campaign.id}**.`
      };
    }

    if (action === 'delete') {
      if (!campaignId) throw new Error('campaignId is required for delete action');
      await client.deleteCampaign(campaignId);
      return {
        output: { campaignId, deleted: true },
        message: `Deleted campaign **${campaignId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.assistantId) body.assistantId = ctx.input.assistantId;
    if (ctx.input.workflowId) body.workflowId = ctx.input.workflowId;
    if (ctx.input.phoneNumberId) body.phoneNumberId = ctx.input.phoneNumberId;
    if (ctx.input.customers) body.customers = ctx.input.customers;
    if (ctx.input.maxConcurrentCalls !== undefined)
      body.maxConcurrentCalls = ctx.input.maxConcurrentCalls;
    if (ctx.input.scheduledAt) body.scheduledAt = ctx.input.scheduledAt;

    if (action === 'create') {
      let campaign = await client.createCampaign(body);
      return {
        output: {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          assistantId: campaign.assistantId,
          workflowId: campaign.workflowId,
          phoneNumberId: campaign.phoneNumberId,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        },
        message: `Created campaign **${campaign.name || campaign.id}**.`
      };
    }

    if (action === 'update') {
      if (!campaignId) throw new Error('campaignId is required for update action');
      let campaign = await client.updateCampaign(campaignId, body);
      return {
        output: {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          assistantId: campaign.assistantId,
          workflowId: campaign.workflowId,
          phoneNumberId: campaign.phoneNumberId,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt
        },
        message: `Updated campaign **${campaign.name || campaign.id}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
