import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dealOutputSchema = z.object({
  dealId: z.number().describe('Deal ID'),
  name: z.string().describe('Deal name'),
  status: z
    .string()
    .optional()
    .describe('Deal status: potential, pending, won, lost, or dropped'),
  currency: z.string().optional().describe('Currency code'),
  money: z.number().optional().describe('Deal value'),
  reminderDate: z.string().optional().describe('Next reminder date'),
  closedOn: z.string().optional().describe('Date when deal was closed'),
  tags: z.array(z.string()).optional().describe('Deal tags'),
  user: z.any().optional().describe('Assigned user details'),
  company: z.any().optional().describe('Associated company details'),
  dealCategory: z.any().optional().describe('Deal category details'),
  info: z.string().optional().describe('Additional notes'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapDeal = (d: any) => ({
  dealId: d.id,
  name: d.name,
  status: d.status,
  currency: d.currency,
  money: d.money,
  reminderDate: d.reminder_date,
  closedOn: d.closed_on,
  tags: d.tags,
  user: d.user,
  company: d.company,
  dealCategory: d.deal_category,
  info: d.info,
  createdAt: d.created_at,
  updatedAt: d.updated_at
});

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `Retrieve a list of deals/leads from the sales pipeline. Filter by status, tags, company, or date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['potential', 'pending', 'won', 'lost', 'dropped'])
        .optional()
        .describe('Filter by deal status'),
      tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
      companyId: z.number().optional().describe('Filter by company ID'),
      closedFrom: z
        .string()
        .optional()
        .describe('Filter deals closed from this date (YYYY-MM-DD)'),
      closedTo: z
        .string()
        .optional()
        .describe('Filter deals closed until this date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      deals: z.array(dealOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.tags) params.tags = ctx.input.tags;
    if (ctx.input.companyId) params.company_id = ctx.input.companyId;
    if (ctx.input.closedFrom) params.closed_from = ctx.input.closedFrom;
    if (ctx.input.closedTo) params.closed_to = ctx.input.closedTo;

    let data = await client.listDeals(params);
    let deals = (data as any[]).map(mapDeal);

    return {
      output: { deals },
      message: `Found **${deals.length}** deals.`
    };
  })
  .build();

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve detailed information about a specific deal/lead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z.number().describe('The ID of the deal to retrieve')
    })
  )
  .output(dealOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let d = await client.getDeal(ctx.input.dealId);

    return {
      output: mapDeal(d),
      message: `Retrieved deal **${d.name}** (ID: ${d.id}).`
    };
  })
  .build();

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal/lead in the sales pipeline. Requires name, currency, deal value, reminder date, assigned user, and deal category.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Deal name'),
      currency: z.string().describe('Currency code (e.g., "EUR")'),
      money: z.number().describe('Deal value/amount'),
      reminderDate: z.string().describe('Next reminder date (YYYY-MM-DD)'),
      userId: z.number().describe('Assigned user ID'),
      dealCategoryId: z.number().describe('Deal category ID'),
      companyId: z.number().optional().describe('Associated company ID'),
      status: z
        .enum(['potential', 'pending', 'won', 'lost', 'dropped'])
        .optional()
        .describe('Deal status'),
      tags: z.array(z.string()).optional().describe('Deal tags'),
      info: z.string().optional().describe('Additional notes')
    })
  )
  .output(dealOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      name: ctx.input.name,
      currency: ctx.input.currency,
      money: ctx.input.money,
      reminder_date: ctx.input.reminderDate,
      user_id: ctx.input.userId,
      deal_category_id: ctx.input.dealCategoryId
    };

    if (ctx.input.companyId) data.company_id = ctx.input.companyId;
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.info) data.info = ctx.input.info;

    let d = await client.createDeal(data);

    return {
      output: mapDeal(d),
      message: `Created deal **${d.name}** (ID: ${d.id}).`
    };
  })
  .build();

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Update an existing deal/lead's properties, status, or assignment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dealId: z.number().describe('The ID of the deal to update'),
      name: z.string().optional().describe('New deal name'),
      money: z.number().optional().describe('New deal value'),
      status: z
        .enum(['potential', 'pending', 'won', 'lost', 'dropped'])
        .optional()
        .describe('New status'),
      reminderDate: z.string().optional().describe('New reminder date (YYYY-MM-DD)'),
      userId: z.number().optional().describe('New assigned user ID'),
      dealCategoryId: z.number().optional().describe('New deal category ID'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      info: z.string().optional().describe('Updated notes')
    })
  )
  .output(dealOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.money !== undefined) data.money = ctx.input.money;
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.reminderDate) data.reminder_date = ctx.input.reminderDate;
    if (ctx.input.userId) data.user_id = ctx.input.userId;
    if (ctx.input.dealCategoryId) data.deal_category_id = ctx.input.dealCategoryId;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.info !== undefined) data.info = ctx.input.info;

    let d = await client.updateDeal(ctx.input.dealId, data);

    return {
      output: mapDeal(d),
      message: `Updated deal **${d.name}** (ID: ${d.id}).`
    };
  })
  .build();

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Permanently delete a deal/lead from MOCO.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dealId: z.number().describe('The ID of the deal to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteDeal(ctx.input.dealId);

    return {
      output: { success: true },
      message: `Deleted deal **${ctx.input.dealId}**.`
    };
  })
  .build();
