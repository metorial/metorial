import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

let proposalFeeSchema = z.object({
  feeId: z.number().describe('Fee ID'),
  name: z.string().describe('Fee name'),
  feeType: z.string().describe('Fee type: fixed, hourly, monthly, yearly, or custom'),
  amount: z.number().describe('Amount per unit'),
  quantity: z.number().nullable().describe('Quantity multiplier'),
  total: z.number().nullable().describe('Calculated total'),
  unit: z.string().nullable().describe('Custom unit label'),
  optional: z.boolean().describe('Whether the fee is optional'),
  description: z.string().nullable().describe('Fee description (HTML)'),
  currency: z.string().nullable().describe('ISO 4217 currency code'),
  url: z.string().describe('API URL'),
  appUrl: z.string().describe('Bidsketch app URL')
});

export let listProposalFees = SlateTool.create(spec, {
  name: 'List Proposal Fees',
  key: 'list_proposal_fees',
  description: `Retrieve all fee items within a specific proposal. Returns both required and optional fees with amounts and totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal')
    })
  )
  .output(
    z.object({
      fees: z.array(proposalFeeSchema).describe('List of proposal fees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let data = await client.listProposalFees(ctx.input.proposalId);

    let fees = (Array.isArray(data) ? data : []).map((f: any) => ({
      feeId: f.id,
      name: f.name,
      feeType: f.feetype,
      amount: f.amount,
      quantity: f.quantity ?? null,
      total: f.total ?? null,
      unit: f.unit ?? null,
      optional: f.optional ?? false,
      description: f.description ?? null,
      currency: f.currency ?? null,
      url: f.url,
      appUrl: f.app_url
    }));

    return {
      output: { fees },
      message: `Found **${fees.length}** fee(s) in proposal ${ctx.input.proposalId}.`
    };
  })
  .build();

export let addProposalFee = SlateTool.create(spec, {
  name: 'Add Proposal Fee',
  key: 'add_proposal_fee',
  description: `Add a fee item to a proposal. Supports fixed, hourly, monthly, yearly, and custom fee types. Fees can be marked as optional for the client.`,
  instructions: [
    'For custom fee types, provide a "unit" label (e.g. "pages", "items").',
    'Set "optional" to true if the client should be able to opt out of this fee.'
  ]
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal'),
      name: z.string().describe('Fee name'),
      feeType: z.enum(['fixed', 'hourly', 'monthly', 'yearly', 'custom']).describe('Fee type'),
      amount: z.number().describe('Amount (total for fixed, per-unit for others)'),
      quantity: z.number().optional().describe('Quantity multiplier'),
      unit: z.string().optional().describe('Custom unit label (for custom fee type)'),
      optional: z.boolean().optional().describe('Whether the fee is optional for the client'),
      description: z.string().optional().describe('Fee description (HTML supported)')
    })
  )
  .output(proposalFeeSchema)
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {
      name: ctx.input.name,
      feetype: ctx.input.feeType,
      amount: ctx.input.amount
    };

    if (ctx.input.quantity !== undefined) body.quantity = ctx.input.quantity;
    if (ctx.input.unit !== undefined) body.unit = ctx.input.unit;
    if (ctx.input.optional !== undefined) body.optional = ctx.input.optional;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let f = await client.createProposalFee(ctx.input.proposalId, body);

    return {
      output: {
        feeId: f.id,
        name: f.name,
        feeType: f.feetype,
        amount: f.amount,
        quantity: f.quantity ?? null,
        total: f.total ?? null,
        unit: f.unit ?? null,
        optional: f.optional ?? false,
        description: f.description ?? null,
        currency: f.currency ?? null,
        url: f.url,
        appUrl: f.app_url
      },
      message: `Added fee **${f.name}** (${f.feetype}) to proposal ${ctx.input.proposalId}.`
    };
  })
  .build();

export let updateProposalFee = SlateTool.create(spec, {
  name: 'Update Proposal Fee',
  key: 'update_proposal_fee',
  description: `Update a fee item within a proposal. Only the provided fields will be modified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal'),
      feeId: z.number().describe('ID of the fee to update'),
      name: z.string().optional().describe('Updated fee name'),
      feeType: z
        .enum(['fixed', 'hourly', 'monthly', 'yearly', 'custom'])
        .optional()
        .describe('Updated fee type'),
      amount: z.number().optional().describe('Updated amount'),
      quantity: z.number().optional().describe('Updated quantity'),
      unit: z.string().optional().describe('Updated custom unit label'),
      optional: z.boolean().optional().describe('Updated optional flag'),
      description: z.string().optional().describe('Updated description (HTML)')
    })
  )
  .output(proposalFeeSchema)
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);

    let body: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.feeType !== undefined) body.feetype = ctx.input.feeType;
    if (ctx.input.amount !== undefined) body.amount = ctx.input.amount;
    if (ctx.input.quantity !== undefined) body.quantity = ctx.input.quantity;
    if (ctx.input.unit !== undefined) body.unit = ctx.input.unit;
    if (ctx.input.optional !== undefined) body.optional = ctx.input.optional;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let f = await client.updateProposalFee(ctx.input.proposalId, ctx.input.feeId, body);

    return {
      output: {
        feeId: f.id,
        name: f.name,
        feeType: f.feetype,
        amount: f.amount,
        quantity: f.quantity ?? null,
        total: f.total ?? null,
        unit: f.unit ?? null,
        optional: f.optional ?? false,
        description: f.description ?? null,
        currency: f.currency ?? null,
        url: f.url,
        appUrl: f.app_url
      },
      message: `Updated fee **${f.name}** in proposal ${ctx.input.proposalId}.`
    };
  })
  .build();

export let removeProposalFee = SlateTool.create(spec, {
  name: 'Remove Proposal Fee',
  key: 'remove_proposal_fee',
  description: `Remove a fee item from a proposal.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      proposalId: z.number().describe('ID of the proposal'),
      feeId: z.number().describe('ID of the fee to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    await client.deleteProposalFee(ctx.input.proposalId, ctx.input.feeId);

    return {
      output: { success: true },
      message: `Removed fee ${ctx.input.feeId} from proposal ${ctx.input.proposalId}.`
    };
  })
  .build();
