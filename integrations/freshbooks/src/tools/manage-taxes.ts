import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let manageTaxes = SlateTool.create(spec, {
  name: 'Manage Taxes',
  key: 'manage_taxes',
  description: `Create, update, or delete tax configurations in FreshBooks. Taxes can be applied to invoices and line items. Supports compound taxes (calculated on top of primary taxes).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      taxId: z.number().optional().describe('Tax ID (required for update/delete)'),
      name: z
        .string()
        .optional()
        .describe('Tax name (e.g. "GST", "HST", "VAT") - required for create'),
      amount: z.string().optional().describe('Tax percentage as string (e.g. "13")'),
      compound: z
        .boolean()
        .optional()
        .describe('Whether this tax is compound (calculated on top of primary taxes)'),
      number: z.string().optional().describe('Tax registration/submission number')
    })
  )
  .output(
    z.object({
      taxId: z.number(),
      name: z.string().nullable().optional(),
      amount: z.string().nullable().optional(),
      compound: z.boolean().nullable().optional(),
      number: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};
      if (ctx.input.name !== undefined) payload.name = ctx.input.name;
      if (ctx.input.amount !== undefined) payload.amount = ctx.input.amount;
      if (ctx.input.compound !== undefined) payload.compound = ctx.input.compound;
      if (ctx.input.number !== undefined) payload.number = ctx.input.number;
      return payload;
    };

    let mapResult = (raw: any) => ({
      taxId: raw.taxid || raw.id,
      name: raw.name,
      amount: raw.amount,
      compound: raw.compound,
      number: raw.number,
      updatedAt: raw.updated
    });

    if (ctx.input.action === 'create') {
      let result = await client.createTax(buildPayload());
      return {
        output: mapResult(result),
        message: `Created tax **${result.name}** at ${result.amount}%.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.taxId) throw new Error('taxId is required for update');
      let result = await client.updateTax(ctx.input.taxId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated tax **${result.name}** (ID: ${ctx.input.taxId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.taxId) throw new Error('taxId is required for delete');
      await client.deleteTax(ctx.input.taxId);
      return {
        output: { taxId: ctx.input.taxId },
        message: `Deleted tax (ID: ${ctx.input.taxId}).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
