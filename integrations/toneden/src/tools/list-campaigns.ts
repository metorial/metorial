import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.number().describe('Unique campaign ID'),
  userId: z.number().describe('Owner user ID'),
  title: z.string().describe('Campaign title'),
  platform: z.string().describe('Ad platform (facebook or google)'),
  status: z.string().describe('Campaign status'),
  budgetType: z.string().optional().describe('Budget type (daily or lifetime)'),
  budgetAmount: z
    .number()
    .optional()
    .describe('Budget amount in lowest currency denomination'),
  amountSpent: z.number().optional().describe('Total amount spent'),
  reach: z.number().optional().describe('Number of people reached'),
  clicks: z.number().optional().describe('Total clicks'),
  conversions: z.number().optional().describe('Total conversions'),
  ctr: z.number().optional().describe('Click-through rate'),
  cpc: z.number().optional().describe('Cost per click')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Ad Campaigns',
  key: 'list_campaigns',
  description: `List all ad campaigns for the authenticated user profile. Supports filtering by campaign status and pagination. Returns campaign details including performance metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'live', 'recent', 'paused', 'error', 'inactive', 'scheduled'])
        .optional()
        .describe('Filter campaigns by status. Defaults to active.'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of campaigns to return')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of ad campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let campaigns = await client.listCampaigns('me', {
      status: ctx.input.status,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let mapped = (campaigns || []).map((c: any) => ({
      campaignId: c.id,
      userId: c.user_id,
      title: c.title,
      platform: c.platform,
      status: c.status,
      budgetType: c.budget_type,
      budgetAmount: c.budget_amount,
      amountSpent: c.amount_spent,
      reach: c.reach,
      clicks: c.clicks,
      conversions: c.conversions,
      ctr: c.ctr,
      cpc: c.cpc
    }));

    return {
      output: { campaigns: mapped },
      message: `Found **${mapped.length}** campaign(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
