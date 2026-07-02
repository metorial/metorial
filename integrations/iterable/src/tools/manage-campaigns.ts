import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { requireArrayField, requireField } from '../lib/validation';
import { spec } from '../spec';

export let manageCampaigns = SlateTool.create(spec, {
  name: 'Manage Campaigns',
  key: 'manage_campaigns',
  description: `List existing campaigns, retrieve campaign details, create new campaigns from templates, archive campaigns, or retrieve campaign metrics. Campaigns can target email, push, SMS, in-app, embedded, and web push channels.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'archive', 'metrics'])
        .describe(
          'Operation: list campaigns, get one campaign, create a campaign, archive campaigns, or get campaign metrics'
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
      scheduleSend: z
        .boolean()
        .optional()
        .describe(
          'Whether Iterable should immediately schedule the campaign. Defaults to false.'
        ),
      sendAt: z.string().optional().describe('ISO 8601 datetime to schedule the campaign'),
      campaignId: z.number().optional().describe('Campaign ID (required for metrics)'),
      campaignIds: z.array(z.number()).optional().describe('Campaign IDs to archive'),
      page: z.number().optional().describe('Page number for listing campaigns'),
      pageSize: z.number().optional().describe('Page size for listing campaigns'),
      sort: z.string().optional().describe('Sort field with optional direction prefix'),
      campaignState: z
        .array(z.string())
        .optional()
        .describe('Filter listed campaigns by state, e.g. Draft, Ready, Archived'),
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
      campaign: z.record(z.string(), z.any()).optional().describe('Campaign details'),
      archivedCampaignIds: z.array(z.number()).optional().describe('Campaign IDs archived'),
      metrics: z
        .record(z.string(), z.any())
        .optional()
        .describe('Campaign performance metrics'),
      metricsText: z.string().optional().describe('Raw campaign metrics response'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    if (ctx.input.action === 'list') {
      let result = await client.getCampaigns({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        sort: ctx.input.sort,
        campaignState: ctx.input.campaignState
      });
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

    if (ctx.input.action === 'get') {
      let campaignId = requireField(ctx.input.campaignId, 'campaignId');
      let campaign = await client.getCampaign(campaignId);
      return {
        output: {
          campaign,
          message: `Retrieved campaign ${campaignId}.`
        },
        message: `Retrieved campaign **${campaignId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let name = requireField(ctx.input.name, 'name');
      let templateId = requireField(ctx.input.templateId, 'templateId');
      let result = await client.createCampaign({
        name,
        listIds: ctx.input.listIds!,
        templateId,
        suppressionListIds: ctx.input.suppressionListIds,
        scheduleSend: ctx.input.scheduleSend ?? false,
        sendAt: ctx.input.sendAt
      });
      return {
        output: {
          campaignId: result.campaignId,
          message: `Campaign "${name}" created.`
        },
        message: `Created campaign **${name}** with ID **${result.campaignId}**.`
      };
    }

    if (ctx.input.action === 'archive') {
      let campaignIds = ctx.input.campaignIds?.length
        ? ctx.input.campaignIds
        : ctx.input.campaignId !== undefined
          ? [ctx.input.campaignId]
          : undefined;
      campaignIds = requireArrayField(campaignIds, 'campaignIds');
      await client.archiveCampaigns(campaignIds);
      return {
        output: {
          archivedCampaignIds: campaignIds,
          message: `Archived ${campaignIds.length} campaign(s).`
        },
        message: `Archived **${campaignIds.length}** campaign(s).`
      };
    }

    // metrics
    let campaignId = requireField(ctx.input.campaignId, 'campaignId');
    let result = await client.getCampaignMetrics(
      campaignId,
      ctx.input.startDateTime,
      ctx.input.endDateTime
    );
    return {
      output: {
        metrics: typeof result === 'object' && result !== null ? result : undefined,
        metricsText: typeof result === 'string' ? result : undefined,
        message: `Retrieved metrics for campaign ${campaignId}.`
      },
      message: `Retrieved metrics for campaign **${campaignId}**.`
    };
  })
  .build();
