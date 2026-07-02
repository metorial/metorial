import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

let optionalNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    let parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

let formatDeal = (d: Record<string, any>) => ({
  dealId: optionalString(d.id),
  name: optionalString(d.name),
  amount: optionalNumber(d.amount),
  closedDate: optionalString(d.closed_date),
  ownerId: optionalString(d.owner_id),
  accountId: optionalString(d.account_id),
  dealStageId: optionalString(d.opportunity_stage_id) || optionalString(d.deal_stage_id),
  stageName: optionalString(d.stage_name),
  status: optionalString(d.status),
  source: optionalString(d.source),
  createdAt: optionalString(d.created_at),
  updatedAt: optionalString(d.updated_at)
});

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `List all deals (opportunities) in your Apollo account. Returns deal details including name, amount, stage, owner, and associated account.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25)')
    })
  )
  .output(
    z.object({
      deals: z.array(
        z.object({
          dealId: z.string().optional(),
          name: z.string().optional(),
          amount: z.number().optional(),
          closedDate: z.string().optional(),
          ownerId: z.string().optional(),
          accountId: z.string().optional(),
          dealStageId: z.string().optional(),
          stageName: z.string().optional(),
          status: z.string().optional(),
          source: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.listDeals({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let deals = result.deals.map(formatDeal);

    return {
      output: {
        deals,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? deals.length}** deals. Returned ${deals.length} results.`
    };
  })
  .build();

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve full details of a specific deal by its ID, including monetary value, stage, owner, and associated account information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z.string().describe('The Apollo deal/opportunity ID')
    })
  )
  .output(
    z.object({
      dealId: z.string().optional(),
      name: z.string().optional(),
      amount: z.number().optional(),
      closedDate: z.string().optional(),
      ownerId: z.string().optional(),
      accountId: z.string().optional(),
      dealStageId: z.string().optional(),
      stageName: z.string().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.viewDeal(ctx.input.dealId);
    let deal = formatDeal(result.deal);

    return {
      output: deal,
      message: `Retrieved deal **${deal.name || deal.dealId}** — Amount: ${deal.amount ? `$${deal.amount}` : 'N/A'}, Stage: ${deal.stageName || deal.dealStageId || 'N/A'}.`
    };
  })
  .build();

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal (opportunity) in Apollo to track account activity including monetary values, deal owners, and stages.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the deal'),
      amount: z.number().optional().describe('Monetary value of the deal'),
      closedDate: z.string().optional().describe('Expected close date (ISO 8601 format)'),
      ownerId: z.string().optional().describe('Apollo user ID of the deal owner'),
      accountId: z.string().optional().describe('Apollo account ID associated with this deal'),
      dealStageId: z
        .string()
        .optional()
        .describe('Deal stage ID (use List Deal Stages to find available IDs)'),
      source: z.string().optional().describe('Source of the deal')
    })
  )
  .output(
    z.object({
      dealId: z.string().optional(),
      name: z.string().optional(),
      amount: z.number().optional(),
      closedDate: z.string().optional(),
      dealStageId: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.createDeal({
      name: ctx.input.name,
      amount: ctx.input.amount,
      closedDate: ctx.input.closedDate,
      ownerId: ctx.input.ownerId,
      accountId: ctx.input.accountId,
      dealStageId: ctx.input.dealStageId,
      source: ctx.input.source
    });

    let deal = formatDeal(result.deal);
    return {
      output: {
        dealId: deal.dealId,
        name: deal.name,
        amount: deal.amount,
        closedDate: deal.closedDate,
        dealStageId: deal.dealStageId,
        createdAt: deal.createdAt
      },
      message: `Created deal **${deal.name}** (ID: ${deal.dealId})${deal.amount ? ` — $${deal.amount}` : ''}.`
    };
  })
  .build();

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Update an existing deal in Apollo. Provide the deal ID and any fields you want to change. Only the provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dealId: z.string().describe('The Apollo deal/opportunity ID to update'),
      name: z.string().optional().describe('Updated deal name'),
      amount: z.number().optional().describe('Updated monetary value'),
      closedDate: z.string().optional().describe('Updated expected close date (ISO 8601)'),
      ownerId: z.string().optional().describe('Updated deal owner user ID'),
      accountId: z.string().optional().describe('Updated associated account ID'),
      dealStageId: z.string().optional().describe('Updated deal stage ID'),
      source: z.string().optional().describe('Updated deal source'),
      status: z.string().optional().describe('Updated deal status')
    })
  )
  .output(
    z.object({
      dealId: z.string().optional(),
      name: z.string().optional(),
      amount: z.number().optional(),
      closedDate: z.string().optional(),
      dealStageId: z.string().optional(),
      status: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.updateDeal(ctx.input.dealId, {
      name: ctx.input.name,
      amount: ctx.input.amount,
      closedDate: ctx.input.closedDate,
      ownerId: ctx.input.ownerId,
      accountId: ctx.input.accountId,
      dealStageId: ctx.input.dealStageId,
      source: ctx.input.source,
      status: ctx.input.status
    });

    let deal = formatDeal(result.deal);
    return {
      output: {
        dealId: deal.dealId,
        name: deal.name,
        amount: deal.amount,
        closedDate: deal.closedDate,
        dealStageId: deal.dealStageId,
        status: deal.status,
        updatedAt: deal.updatedAt
      },
      message: `Updated deal **${deal.name || deal.dealId}**.`
    };
  })
  .build();
