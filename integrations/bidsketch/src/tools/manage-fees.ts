import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

let feeSchema = z.object({
  feeId: z.number().describe('Unique fee ID'),
  name: z.string().describe('Fee name'),
  feeType: z.string().describe('Fee type: fixed, hourly, monthly, yearly, or custom'),
  amount: z.number().describe('Amount per unit'),
  quantity: z.number().nullable().describe('Quantity/multiplier'),
  total: z.number().nullable().describe('Calculated total'),
  unit: z.string().nullable().describe('Custom unit label (for custom fee types)'),
  category: z.string().nullable().describe('Category for grouping'),
  description: z.string().nullable().describe('Fee description (HTML)'),
  currency: z.string().nullable().describe('ISO 4217 currency code'),
  url: z.string().describe('API URL'),
  appUrl: z.string().describe('Bidsketch app URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listFees = SlateTool.create(spec, {
  name: 'List Fees',
  key: 'list_fees',
  description: `Retrieve reusable fee items saved to the Bidsketch account library. These are template fees that can be added to proposals. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of fees per page (max 100)')
    })
  )
  .output(
    z.object({
      fees: z.array(feeSchema).describe('List of reusable fees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let data = await client.listFees(ctx.input.page, ctx.input.perPage);

    let fees = (Array.isArray(data) ? data : []).map((f: any) => ({
      feeId: f.id,
      name: f.name,
      feeType: f.feetype,
      amount: f.amount,
      quantity: f.quantity ?? null,
      total: f.total ?? null,
      unit: f.unit ?? null,
      category: f.category ?? null,
      description: f.description ?? null,
      currency: f.currency ?? null,
      url: f.url,
      appUrl: f.app_url,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));

    return {
      output: { fees },
      message: `Found **${fees.length}** reusable fee(s).`
    };
  })
  .build();

export let createFee = SlateTool.create(spec, {
  name: 'Create Fee',
  key: 'create_fee',
  description: `Create a new reusable fee item in the Bidsketch library. Reusable fees can later be added to proposals. Supports fixed, hourly, monthly, yearly, and custom fee types.`,
  instructions: [
    'For custom fee types, provide a "unit" label (e.g. "pages", "items").',
    'Amount is the per-unit cost; total is calculated as amount × quantity.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Fee name'),
      feeType: z.enum(['fixed', 'hourly', 'monthly', 'yearly', 'custom']).describe('Fee type'),
      amount: z.number().describe('Amount (total for fixed, per-unit for others)'),
      quantity: z.number().optional().describe('Quantity multiplier'),
      unit: z.string().optional().describe('Custom unit label (required for custom fee type)'),
      category: z.string().optional().describe('Category for grouping'),
      description: z.string().optional().describe('Fee description (HTML supported)')
    })
  )
  .output(feeSchema)
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {
      name: ctx.input.name,
      feetype: ctx.input.feeType,
      amount: ctx.input.amount
    };

    if (ctx.input.quantity !== undefined) body.quantity = ctx.input.quantity;
    if (ctx.input.unit !== undefined) body.unit = ctx.input.unit;
    if (ctx.input.category !== undefined) body.category = ctx.input.category;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let f = await client.createFee(body);

    return {
      output: {
        feeId: f.id,
        name: f.name,
        feeType: f.feetype,
        amount: f.amount,
        quantity: f.quantity ?? null,
        total: f.total ?? null,
        unit: f.unit ?? null,
        category: f.category ?? null,
        description: f.description ?? null,
        currency: f.currency ?? null,
        url: f.url,
        appUrl: f.app_url,
        createdAt: f.created_at,
        updatedAt: f.updated_at
      },
      message: `Created fee **${f.name}** (${f.feetype}, ID: ${f.id}).`
    };
  })
  .build();

export let updateFee = SlateTool.create(spec, {
  name: 'Update Fee',
  key: 'update_fee',
  description: `Update an existing reusable fee item in the Bidsketch library. Only the provided fields will be modified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      feeId: z.number().describe('ID of the fee to update'),
      name: z.string().optional().describe('Updated name'),
      feeType: z
        .enum(['fixed', 'hourly', 'monthly', 'yearly', 'custom'])
        .optional()
        .describe('Updated fee type'),
      amount: z.number().optional().describe('Updated amount'),
      quantity: z.number().optional().describe('Updated quantity'),
      unit: z.string().optional().describe('Updated custom unit label'),
      category: z.string().optional().describe('Updated category'),
      description: z.string().optional().describe('Updated description (HTML)')
    })
  )
  .output(feeSchema)
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.feeType !== undefined) body.feetype = ctx.input.feeType;
    if (ctx.input.amount !== undefined) body.amount = ctx.input.amount;
    if (ctx.input.quantity !== undefined) body.quantity = ctx.input.quantity;
    if (ctx.input.unit !== undefined) body.unit = ctx.input.unit;
    if (ctx.input.category !== undefined) body.category = ctx.input.category;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let f = await client.updateFee(ctx.input.feeId, body);

    return {
      output: {
        feeId: f.id,
        name: f.name,
        feeType: f.feetype,
        amount: f.amount,
        quantity: f.quantity ?? null,
        total: f.total ?? null,
        unit: f.unit ?? null,
        category: f.category ?? null,
        description: f.description ?? null,
        currency: f.currency ?? null,
        url: f.url,
        appUrl: f.app_url,
        createdAt: f.created_at,
        updatedAt: f.updated_at
      },
      message: `Updated fee **${f.name}** (ID: ${f.id}).`
    };
  })
  .build();

export let deleteFee = SlateTool.create(spec, {
  name: 'Delete Fee',
  key: 'delete_fee',
  description: `Delete a reusable fee item from the Bidsketch library.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      feeId: z.number().describe('ID of the fee to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    await client.deleteFee(ctx.input.feeId);

    return {
      output: { success: true },
      message: `Deleted fee with ID **${ctx.input.feeId}**.`
    };
  })
  .build();
