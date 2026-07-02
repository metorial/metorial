import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create a new campaign or update an existing one. When creating, provide campaign details like name, objective, and budget. When updating, provide the campaign ID and the fields to change. Supports all campaign objectives including traffic, conversions, impressions, video views, and app installs.`,
  instructions: [
    'To create a campaign, omit the campaignId field. To update, provide the campaignId of the campaign to modify.',
    'Budget is specified in cents (e.g., 10000 = $100.00 USD).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID to update; omit to create a new campaign'),
      name: z.string().optional().describe('Campaign name'),
      objective: z
        .enum([
          'BRAND_AWARENESS',
          'TRAFFIC',
          'CONVERSIONS',
          'VIDEO_VIEWS',
          'APP_INSTALLS',
          'CATALOG_SALES',
          'REACH',
          'ENGAGEMENT'
        ])
        .optional()
        .describe('Campaign objective'),
      budgetCents: z
        .number()
        .optional()
        .describe('Total budget in cents (e.g., 10000 = $100 USD)'),
      budgetType: z.enum(['DAILY', 'LIFETIME']).optional().describe('Budget type'),
      startDate: z.string().optional().describe('Campaign start date in ISO 8601 format'),
      endDate: z.string().optional().describe('Campaign end date in ISO 8601 format'),
      status: z.enum(['ACTIVE', 'PAUSED']).optional().describe('Campaign status')
    })
  )
  .output(
    z.object({
      campaignId: z.string().optional(),
      name: z.string().optional(),
      objective: z.string().optional(),
      status: z.string().optional(),
      budgetCents: z.number().optional(),
      budgetType: z.string().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let payload: Record<string, any> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.objective !== undefined) payload.objective = ctx.input.objective;
    if (ctx.input.budgetCents !== undefined) payload.budget_cents = ctx.input.budgetCents;
    if (ctx.input.budgetType !== undefined) payload.budget_type = ctx.input.budgetType;
    if (ctx.input.startDate !== undefined) payload.start_date = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) payload.end_date = ctx.input.endDate;
    if (ctx.input.status !== undefined) payload.status = ctx.input.status;

    let result: any;
    let action: string;

    if (ctx.input.campaignId) {
      result = await client.updateCampaign(ctx.input.campaignId, payload);
      action = 'updated';
    } else {
      result = await client.createCampaign(payload);
      action = 'created';
    }

    return {
      output: {
        campaignId: result.id || result.campaign_id,
        name: result.name,
        objective: result.objective,
        status: result.status || result.effective_status,
        budgetCents: result.budget_cents || result.budget,
        budgetType: result.budget_type,
        raw: result
      },
      message: `Campaign **${result.name || ctx.input.name}** ${action} successfully.`
    };
  })
  .build();
