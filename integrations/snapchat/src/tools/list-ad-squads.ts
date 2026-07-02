import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

let adSquadSchema = z.object({
  adSquadId: z.string().describe('Unique ID of the ad squad'),
  campaignId: z.string().optional().describe('Parent campaign ID'),
  name: z.string().optional().describe('Ad squad name'),
  status: z.string().optional().describe('Ad squad status'),
  type: z.string().optional().describe('Ad squad type'),
  billingEvent: z.string().optional().describe('Billing event type'),
  bidMicro: z.number().optional().describe('Bid amount in micro-currency'),
  dailyBudgetMicro: z.number().optional().describe('Daily budget in micro-currency'),
  startTime: z.string().optional().describe('Start time'),
  endTime: z.string().optional().describe('End time'),
  optimizationGoal: z.string().optional().describe('Optimization goal'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listAdSquads = SlateTool.create(spec, {
  name: 'List Ad Squads',
  key: 'list_ad_squads',
  description: `List all ad squads (ad sets) under a Snapchat campaign. Returns ad squad IDs, names, statuses, budgets, bids, and targeting details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID to list ad squads for'),
      limit: z
        .number()
        .int()
        .min(50)
        .max(1000)
        .optional()
        .describe('Maximum number of ad squads to return, from 50 to 1000'),
      cursor: z.string().optional().describe('Pagination cursor from a previous nextLink')
    })
  )
  .output(
    z.object({
      adSquads: z.array(adSquadSchema).describe('List of ad squads'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination URL for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.listAdSquads(
      ctx.input.campaignId,
      ctx.input.limit,
      ctx.input.cursor
    );

    let adSquads = result.items.map((a: any) => ({
      adSquadId: a.id,
      campaignId: a.campaign_id,
      name: a.name,
      status: a.status,
      type: a.type,
      billingEvent: a.billing_event,
      bidMicro: a.bid_micro,
      dailyBudgetMicro: a.daily_budget_micro,
      startTime: a.start_time,
      endTime: a.end_time,
      optimizationGoal: a.optimization_goal,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: { adSquads, nextLink: result.nextLink },
      message: `Found **${adSquads.length}** ad squad(s).`
    };
  })
  .build();
