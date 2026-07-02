import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushV4Client } from '../lib/v4-client';
import { spec } from '../spec';

export let getMapRankings = SlateTool.create(spec, {
  name: 'Get Map Rankings',
  key: 'get_map_rankings',
  description: `Access Map Rank Tracker data including campaigns, keyword rankings, heatmaps, and top competitors for local map pack rankings.
Available to all Semrush users without consuming API units. Requires OAuth 2.0 authentication.`,
  instructions: [
    'Use reportType "campaigns" to list all campaigns, "keywords" to see tracked keywords for a campaign, "heatmap" for geo-grid ranking data, and "competitors" for top local competitors.',
    'For heatmap data, both campaignId and keywordId are required.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['campaigns', 'campaign_details', 'keywords', 'heatmap', 'competitors'])
        .describe('Type of map rank data to retrieve'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for all except "campaigns")'),
      keywordId: z.string().optional().describe('Keyword ID (required for heatmap)'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of map rank tracker campaigns'),
      campaign: z.record(z.string(), z.unknown()).optional().describe('Campaign details'),
      keywords: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Tracked keywords with ranking data'),
      heatmap: z.record(z.string(), z.unknown()).optional().describe('Heatmap geo-grid data'),
      competitors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Top local competitors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushV4Client({
      token: ctx.auth.token
    });

    switch (ctx.input.reportType) {
      case 'campaigns': {
        let campaigns = await client.getMapRankTrackerCampaigns({
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        return {
          output: { campaigns },
          message: `Found ${campaigns.length} map rank tracker campaigns.`
        };
      }

      case 'campaign_details': {
        if (!ctx.input.campaignId)
          throw new Error('campaignId is required for campaign_details.');
        let campaign = await client.getMapRankTrackerCampaign(ctx.input.campaignId);
        return {
          output: { campaign },
          message: `Retrieved details for campaign **${ctx.input.campaignId}**.`
        };
      }

      case 'keywords': {
        if (!ctx.input.campaignId) throw new Error('campaignId is required for keywords.');
        let keywords = await client.getMapRankTrackerKeywords(ctx.input.campaignId, {
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        return {
          output: { keywords },
          message: `Retrieved ${keywords.length} keywords for campaign **${ctx.input.campaignId}**.`
        };
      }

      case 'heatmap': {
        if (!ctx.input.campaignId) throw new Error('campaignId is required for heatmap.');
        if (!ctx.input.keywordId) throw new Error('keywordId is required for heatmap.');
        let heatmap = await client.getMapRankTrackerHeatmap(
          ctx.input.campaignId,
          ctx.input.keywordId
        );
        return {
          output: { heatmap },
          message: `Retrieved heatmap data for keyword **${ctx.input.keywordId}** in campaign **${ctx.input.campaignId}**.`
        };
      }

      case 'competitors': {
        if (!ctx.input.campaignId) throw new Error('campaignId is required for competitors.');
        let competitors = await client.getMapRankTrackerCompetitors(ctx.input.campaignId, {
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        return {
          output: { competitors },
          message: `Found ${competitors.length} competitors for campaign **${ctx.input.campaignId}**.`
        };
      }

      default:
        throw new Error(`Unknown report type: ${ctx.input.reportType}`);
    }
  })
  .build();
