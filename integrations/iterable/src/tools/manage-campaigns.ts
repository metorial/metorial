import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `List existing campaigns, create new blast campaigns, or retrieve campaign metrics. Campaigns can target email, push, SMS, in-app, and web push channels.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'metrics'])
        .describe(
          'Operation: list all campaigns, create a new blast campaign, or get campaign metrics'
        ),
      name: z.string().optional().describe('Campaign name (required for create)'),
      listIds: z
        .array(z.number())
        .optional()
        .describe('List IDs to target (required for create)'),
      templateId: z
        .number()
        .optional()
        .describe('Template ID for the campaign (required for create)'),
      suppressionListIds: z
        .array(z.number())
        .optional()
        .describe('List IDs to suppress from the campaign'),
      sendAt: z.string().optional().describe('ISO 8601 datetime to schedule the campaign'),
      campaignId: z.number().optional().describe('Campaign ID (required for metrics)'),
      startDateTime: z.string().optional().describe('Start datetime for metrics range'),
      endDateTime: z.string().optional().describe('End datetime for metrics range')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.number().describe('Campaign ID'),
            name: z.string().optional().describe('Campaign name'),
            campaignState: z.string().optional().describe('Current state of the campaign'),
            type: z.string().optional().describe('Campaign type'),
            templateId: z.number().optional().describe('Template ID used'),
            createdAt: z.string().optional().describe('When the campaign was created')
          })
        )
        .optional()
        .describe('List of campaigns'),
      campaignId: z.number().optional().describe('Newly created campaign ID'),
      metrics: z
        .record(z.string(), z.any())
        .optional()
        .describe('Campaign performance metrics'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    if (ctx.input.action === 'list') {
      let result = await client.getCampaigns();
      let campaigns = (result.campaigns || []).map((c: any) => ({
        campaignId: c.id,
        name: c.name,
        campaignState: c.campaignState,
        type: c.type,
        templateId: c.templateId,
        createdAt: c.createdAt ? String(c.createdAt) : undefined
      }));
      return {
        output: {
          campaigns,
          message: `Found ${campaigns.length} campaign(s).`
        },
        message: `Retrieved **${campaigns.length}** campaign(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createCampaign({
        name: ctx.input.name!,
        listIds: ctx.input.listIds!,
        templateId: ctx.input.templateId!,
        suppressionListIds: ctx.input.suppressionListIds,
        sendAt: ctx.input.sendAt
      });
      return {
        output: {
          campaignId: result.campaignId,
          message: `Campaign "${ctx.input.name}" created.`
        },
        message: `Created campaign **${ctx.input.name}** with ID **${result.campaignId}**.`
      };
    }

    // metrics
    let result = await client.getCampaignMetrics(
      ctx.input.campaignId!,
      ctx.input.startDateTime,
      ctx.input.endDateTime
    );
    return {
      output: {
        metrics: result,
        message: `Retrieved metrics for campaign ${ctx.input.campaignId}.`
      },
      message: `Retrieved metrics for campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
