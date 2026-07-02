import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushV4Client } from '../lib/v4-client';
import { spec } from '../spec';

export let managePositionTracking = SlateTool.create(spec, {
  name: 'Manage Position Tracking',
  key: 'manage_position_tracking',
  description: `Set up and manage position tracking campaigns within Semrush projects. Create campaigns, add/remove tracked keywords, and retrieve ranking reports.
Requires OAuth 2.0 authentication.`,
  instructions: [
    'First create a project using the Manage Project tool, then use the projectId here.',
    'Use action "list_campaigns" to see existing campaigns, "create_campaign" to start tracking, "get_keywords" to see tracked keywords, "add_keywords"/"remove_keywords" to manage keywords, and "get_report" for ranking data.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_campaigns',
          'create_campaign',
          'get_keywords',
          'add_keywords',
          'remove_keywords',
          'get_report'
        ])
        .describe('Action to perform'),
      projectId: z.string().describe('Semrush project ID'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for keyword and report actions)'),
      domain: z.string().optional().describe('Domain to track (required for create_campaign)'),
      searchEngine: z.string().optional().describe('Search engine to track (e.g., "google")'),
      location: z
        .string()
        .optional()
        .describe('Location for tracking (e.g., "United States")'),
      device: z.string().optional().describe('Device type: "desktop" or "mobile"'),
      keywords: z.array(z.string()).optional().describe('Keywords to add or remove'),
      competitors: z
        .array(z.string())
        .optional()
        .describe('Competitor domains (for create_campaign)'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of position tracking campaigns'),
      campaign: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Created campaign details'),
      keywords: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Tracked keywords'),
      report: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Position tracking report data'),
      success: z.boolean().optional().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushV4Client({
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'list_campaigns': {
        let campaigns = await client.getPositionTrackingCampaigns(ctx.input.projectId);
        return {
          output: { campaigns },
          message: `Found ${campaigns.length} position tracking campaigns for project **${ctx.input.projectId}**.`
        };
      }

      case 'create_campaign': {
        if (!ctx.input.domain) throw new Error('domain is required for create_campaign.');
        let campaign = await client.createPositionTrackingCampaign(ctx.input.projectId, {
          domain: ctx.input.domain,
          searchEngine: ctx.input.searchEngine,
          location: ctx.input.location,
          device: ctx.input.device,
          keywords: ctx.input.keywords,
          competitors: ctx.input.competitors
        });
        return {
          output: { campaign },
          message: `Created position tracking campaign for **${ctx.input.domain}**.`
        };
      }

      case 'get_keywords': {
        if (!ctx.input.campaignId) throw new Error('campaignId is required for get_keywords.');
        let keywords = await client.getPositionTrackingKeywords(
          ctx.input.projectId,
          ctx.input.campaignId,
          { limit: ctx.input.limit, offset: ctx.input.offset }
        );
        return {
          output: { keywords },
          message: `Retrieved ${keywords.length} tracked keywords.`
        };
      }

      case 'add_keywords': {
        if (!ctx.input.campaignId) throw new Error('campaignId is required for add_keywords.');
        if (!ctx.input.keywords?.length)
          throw new Error('keywords array is required for add_keywords.');
        let result = await client.addPositionTrackingKeywords(
          ctx.input.projectId,
          ctx.input.campaignId,
          ctx.input.keywords
        );
        return {
          output: { success: true, campaign: result },
          message: `Added ${ctx.input.keywords.length} keywords to campaign **${ctx.input.campaignId}**.`
        };
      }

      case 'remove_keywords': {
        if (!ctx.input.campaignId)
          throw new Error('campaignId is required for remove_keywords.');
        if (!ctx.input.keywords?.length)
          throw new Error('keywords array is required for remove_keywords.');
        await client.removePositionTrackingKeywords(
          ctx.input.projectId,
          ctx.input.campaignId,
          ctx.input.keywords
        );
        return {
          output: { success: true },
          message: `Removed ${ctx.input.keywords.length} keywords from campaign **${ctx.input.campaignId}**.`
        };
      }

      case 'get_report': {
        if (!ctx.input.campaignId) throw new Error('campaignId is required for get_report.');
        let report = await client.getPositionTrackingReport(
          ctx.input.projectId,
          ctx.input.campaignId,
          { limit: ctx.input.limit, offset: ctx.input.offset }
        );
        return {
          output: { report },
          message: `Retrieved position tracking report with ${report.length} entries.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
