import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { facebookServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getAdInsights = SlateTool.create(spec, {
  name: 'Get Ad Insights',
  key: 'get_ad_insights',
  description: `Retrieve ad account information and campaign performance insights. Can list ad accounts, list campaigns, or get performance metrics for a specific campaign.
Use \`action\` to select the operation.`,
  instructions: [
    'Use `list_accounts` to see all ad accounts for the authenticated user.',
    'Use `list_campaigns` with an `adAccountId` (e.g. `act_123456`) to list campaigns.',
    'Use `campaign_insights` with a `campaignId` to get performance data.',
    'Date presets: `today`, `yesterday`, `this_month`, `last_month`, `last_7d`, `last_30d`, `last_90d`.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_accounts', 'list_campaigns', 'campaign_insights'])
        .describe('Operation to perform'),
      adAccountId: z
        .string()
        .optional()
        .describe('Ad account ID (required for list_campaigns, e.g. act_123456)'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for campaign_insights)'),
      datePreset: z
        .string()
        .optional()
        .describe('Predefined date range (e.g. last_30d, this_month)'),
      since: z.string().optional().describe('Start date for custom range (YYYY-MM-DD)'),
      until: z.string().optional().describe('End date for custom range (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Max results (for list_campaigns)')
    })
  )
  .output(
    z.object({
      adAccounts: z
        .array(
          z.object({
            adAccountId: z.string().describe('Ad account ID'),
            name: z.string().describe('Account name'),
            accountStatus: z.number().describe('Account status code'),
            currency: z.string().describe('Account currency')
          })
        )
        .optional()
        .describe('List of ad accounts'),
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID'),
            name: z.string().describe('Campaign name'),
            objective: z.string().optional().describe('Campaign objective'),
            status: z.string().optional().describe('Campaign status'),
            dailyBudget: z.string().optional().describe('Daily budget in currency subunits'),
            lifetimeBudget: z
              .string()
              .optional()
              .describe('Lifetime budget in currency subunits'),
            startTime: z.string().optional().describe('Campaign start time'),
            stopTime: z.string().optional().describe('Campaign stop time')
          })
        )
        .optional()
        .describe('List of campaigns'),
      insights: z.array(z.any()).optional().describe('Campaign performance insights data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.action === 'list_accounts') {
      let accounts = await client.getAdAccounts();
      return {
        output: {
          adAccounts: accounts.map(a => ({
            adAccountId: a.id,
            name: a.name,
            accountStatus: a.account_status,
            currency: a.currency
          }))
        },
        message: `Found **${accounts.length}** ad account(s).`
      };
    }

    if (ctx.input.action === 'list_campaigns') {
      if (!ctx.input.adAccountId) {
        throw facebookServiceError('adAccountId is required for list_campaigns action');
      }
      let result = await client.getCampaigns(ctx.input.adAccountId, {
        limit: ctx.input.limit
      });
      return {
        output: {
          campaigns: result.data.map((c: any) => ({
            campaignId: c.id,
            name: c.name,
            objective: c.objective,
            status: c.status,
            dailyBudget: c.daily_budget,
            lifetimeBudget: c.lifetime_budget,
            startTime: c.start_time,
            stopTime: c.stop_time
          }))
        },
        message: `Found **${result.data.length}** campaign(s).`
      };
    }

    // campaign_insights
    if (!ctx.input.campaignId) {
      throw facebookServiceError('campaignId is required for campaign_insights action');
    }
    let insights = await client.getCampaignInsights(ctx.input.campaignId, {
      datePreset: ctx.input.datePreset,
      since: ctx.input.since,
      until: ctx.input.until
    });

    return {
      output: { insights },
      message: `Retrieved insights for campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
