import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taxSchema = z.object({
  taxId: z.string().describe('Tax ID'),
  taxName: z.string().optional().describe('Tax name'),
  taxType: z.string().optional().describe('Tax type (e.g., INCLUDED, ADDED)'),
  taxRate: z.number().optional().describe('Tax rate as a percentage'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

export let listTaxes = SlateTool.create(spec, {
  name: 'List Taxes',
  key: 'list_taxes',
  description: `Retrieve all tax configurations. Taxes can be applied to items and receipts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional(),
      cursor: z.string().optional(),
      showDeleted: z.boolean().optional()
    })
  )
  .output(
    z.object({
      taxes: z.array(taxSchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTaxes({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let taxes = (result.taxes ?? []).map((t: any) => ({
      taxId: t.id,
      taxName: t.name,
      taxType: t.type,
      taxRate: t.rate,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      deletedAt: t.deleted_at
    }));

    return {
      output: { taxes, cursor: result.cursor },
      message: `Retrieved **${taxes.length}** tax(es).`
    };
  })
  .build();

export let createOrUpdateTax = SlateTool.create(spec, {
  name: 'Create or Update Tax',
  key: 'create_or_update_tax',
  description: `Create a new tax rate or update an existing one. Taxes can be configured as included in or added to item prices.`
})
  .input(
    z.object({
      taxId: z.string().optional().describe('Tax ID to update; omit to create'),
      taxName: z.string().optional().describe('Tax name'),
      taxType: z
        .enum(['INCLUDED', 'ADDED'])
        .optional()
        .describe('Whether tax is included in or added to item price'),
      taxRate: z.number().optional().describe('Tax rate as a percentage')
    })
  )
  .output(taxSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {};
    if (ctx.input.taxId) body.id = ctx.input.taxId;
    if (ctx.input.taxName !== undefined) body.name = ctx.input.taxName;
    if (ctx.input.taxType !== undefined) body.type = ctx.input.taxType;
    if (ctx.input.taxRate !== undefined) body.rate = ctx.input.taxRate;

    let result = await client.createOrUpdateTax(body);
    let isUpdate = !!ctx.input.taxId;

    return {
      output: {
        taxId: result.id,
        taxName: result.name,
        taxType: result.type,
        taxRate: result.rate,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        deletedAt: result.deleted_at
      },
      message: `${isUpdate ? 'Updated' : 'Created'} tax **${result.name}**.`
    };
  })
  .build();

export let deleteTax = SlateTool.create(spec, {
  name: 'Delete Tax',
  key: 'delete_tax',
  description: `Delete a tax configuration by its ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      taxId: z.string().describe('ID of the tax to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTax(ctx.input.taxId);

    return {
      output: { deleted: true },
      message: `Deleted tax \`${ctx.input.taxId}\`.`
    };
  })
  .build();
