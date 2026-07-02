import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve all advertising campaigns for the configured Reddit Ads account. Returns campaign details including name, objective, status, budget, and scheduling information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT'])
        .optional()
        .describe('Filter campaigns by status')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.string().optional(),
          name: z.string().optional(),
          objective: z.string().optional(),
          status: z.string().optional(),
          budgetCents: z.number().optional(),
          budgetType: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          isProcessing: z.boolean().optional(),
          raw: z.any().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedditAdsClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let campaigns = await client.listCampaigns({
      status: ctx.input.status
    });

    let mapped = (Array.isArray(campaigns) ? campaigns : []).map((c: any) => ({
      campaignId: c.id || c.campaign_id,
      name: c.name,
      objective: c.objective,
      status: c.status || c.effective_status,
      budgetCents: c.budget_cents || c.budget,
      budgetType: c.budget_type,
      startDate: c.start_date,
      endDate: c.end_date,
      isProcessing: c.is_processing,
      raw: c
    }));

    return {
      output: { campaigns: mapped },
      message: `Found **${mapped.length}** campaign(s).`
    };
  })
  .build();
