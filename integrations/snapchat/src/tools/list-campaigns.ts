import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string().describe('Unique ID of the campaign'),
  name: z.string().optional().describe('Campaign name'),
  status: z.string().optional().describe('Campaign status'),
  objective: z.string().optional().describe('Campaign objective'),
  startTime: z.string().optional().describe('Campaign start time'),
  endTime: z.string().optional().describe('Campaign end time'),
  dailyBudgetMicro: z.number().optional().describe('Daily budget in micro-currency'),
  lifetimeSpendCapMicro: z
    .number()
    .optional()
    .describe('Lifetime spend cap in micro-currency'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List all campaigns under a Snapchat ad account. Returns campaign IDs, names, statuses, objectives, budgets, and schedules.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      adAccountId: z.string().describe('Ad account ID to list campaigns for'),
      limit: z
        .number()
        .int()
        .min(50)
        .max(1000)
        .optional()
        .describe('Maximum number of campaigns to return, from 50 to 1000'),
      cursor: z.string().optional().describe('Pagination cursor from a previous nextLink')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of campaigns'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination URL for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.listCampaigns(
      ctx.input.adAccountId,
      ctx.input.limit,
      ctx.input.cursor
    );

    let campaigns = result.items.map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      startTime: c.start_time,
      endTime: c.end_time,
      dailyBudgetMicro: c.daily_budget_micro,
      lifetimeSpendCapMicro: c.lifetime_spend_cap_micro,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { campaigns, nextLink: result.nextLink },
      message: `Found **${campaigns.length}** campaign(s).`
    };
  })
  .build();
