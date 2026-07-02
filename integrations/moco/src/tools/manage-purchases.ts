import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let purchaseItemSchema = z.object({
  title: z.string().describe('Item title'),
  total: z.number().describe('Item total amount'),
  tax: z.number().describe('Tax percentage for this item')
});

let purchaseOutputSchema = z.object({
  purchaseId: z.number().describe('Purchase/expenditure ID'),
  title: z.string().optional().describe('Purchase title'),
  identifier: z.string().optional().describe('Purchase identifier'),
  status: z.string().optional().describe('Purchase status'),
  date: z.string().optional().describe('Purchase date'),
  currency: z.string().optional().describe('Currency code'),
  paymentMethod: z.string().optional().describe('Payment method'),
  netTotal: z.number().optional().describe('Net total amount'),
  grossTotal: z.number().optional().describe('Gross total amount'),
  tax: z.number().optional().describe('Tax amount'),
  tags: z.array(z.string()).optional().describe('Purchase tags'),
  company: z.any().optional().describe('Supplier company details'),
  category: z.any().optional().describe('Purchase category details'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapPurchase = (p: any) => ({
  purchaseId: p.id,
  title: p.title,
  identifier: p.identifier,
  status: p.status,
  date: p.date,
  currency: p.currency,
  paymentMethod: p.payment_method,
  netTotal: p.net_total,
  grossTotal: p.gross_total,
  tax: p.tax,
  tags: p.tags,
  company: p.company,
  category: p.category,
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

export let listPurchases = SlateTool.create(spec, {
  name: 'List Purchases',
  key: 'list_purchases',
  description: `Retrieve a list of purchases/expenditures. Filter by category, company, status, payment method, tags, or date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z.number().optional().describe('Filter by purchase category ID'),
      companyId: z.number().optional().describe('Filter by supplier company ID'),
      status: z.string().optional().describe('Filter by status'),
      paymentMethod: z.string().optional().describe('Filter by payment method'),
      tags: z.string().optional().describe('Comma-separated list of tags'),
      term: z.string().optional().describe('Full-text search term'),
      unpaid: z.boolean().optional().describe('Filter for unpaid purchases')
    })
  )
  .output(
    z.object({
      purchases: z.array(purchaseOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.categoryId) params.category_id = ctx.input.categoryId;
    if (ctx.input.companyId) params.company_id = ctx.input.companyId;
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.paymentMethod) params.payment_method = ctx.input.paymentMethod;
    if (ctx.input.tags) params.tags = ctx.input.tags;
    if (ctx.input.term) params.term = ctx.input.term;
    if (ctx.input.unpaid !== undefined) params.unpaid = ctx.input.unpaid;

    let data = await client.listPurchases(params);
    let purchases = (data as any[]).map(mapPurchase);

    return {
      output: { purchases },
      message: `Found **${purchases.length}** purchases.`
    };
  })
  .build();

export let getPurchase = SlateTool.create(spec, {
  name: 'Get Purchase',
  key: 'get_purchase',
  description: `Retrieve detailed information about a specific purchase/expenditure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      purchaseId: z.number().describe('The ID of the purchase to retrieve')
    })
  )
  .output(purchaseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let p = await client.getPurchase(ctx.input.purchaseId);

    return {
      output: mapPurchase(p),
      message: `Retrieved purchase **${p.title || p.identifier}** (ID: ${p.id}).`
    };
  })
  .build();

export let createPurchase = SlateTool.create(spec, {
  name: 'Create Purchase',
  key: 'create_purchase',
  description: `Create a new purchase/expenditure. Requires date, currency, payment method, and at least one item with title, total, and tax rate.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Purchase date (YYYY-MM-DD)'),
      currency: z.string().describe('Currency code (e.g., "EUR")'),
      paymentMethod: z
        .string()
        .describe('Payment method (e.g., "bank_transfer", "credit_card", "cash")'),
      items: z.array(purchaseItemSchema).describe('Purchase line items'),
      title: z.string().optional().describe('Purchase title'),
      companyId: z.number().optional().describe('Supplier company ID'),
      dueDate: z.string().optional().describe('Payment due date (YYYY-MM-DD)'),
      tags: z.array(z.string()).optional().describe('Purchase tags')
    })
  )
  .output(purchaseOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      date: ctx.input.date,
      currency: ctx.input.currency,
      payment_method: ctx.input.paymentMethod,
      items: ctx.input.items
    };

    if (ctx.input.title) data.title = ctx.input.title;
    if (ctx.input.companyId) data.company_id = ctx.input.companyId;
    if (ctx.input.dueDate) data.due_date = ctx.input.dueDate;
    if (ctx.input.tags) data.tags = ctx.input.tags;

    let p = await client.createPurchase(data);

    return {
      output: mapPurchase(p),
      message: `Created purchase **${p.title || p.identifier}** (ID: ${p.id}).`
    };
  })
  .build();

export let deletePurchase = SlateTool.create(spec, {
  name: 'Delete Purchase',
  key: 'delete_purchase',
  description: `Delete a purchase/expenditure. Only pending purchases with no payments can be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      purchaseId: z.number().describe('The ID of the purchase to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deletePurchase(ctx.input.purchaseId);

    return {
      output: { success: true },
      message: `Deleted purchase **${ctx.input.purchaseId}**.`
    };
  })
  .build();
