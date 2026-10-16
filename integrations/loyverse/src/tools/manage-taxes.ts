import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { pickWritable, requireForCreate } from '../lib/upsert';
import { spec } from '../spec';

let taxSchema = z.object({
  taxId: z.string().describe('Tax ID'),
  taxName: z.string().optional().describe('Tax name'),
  taxType: z.string().optional().describe('Tax type (INCLUDED or ADDED)'),
  taxRate: z.number().optional().describe('Tax rate as a percentage'),
  storeIds: z.array(z.string()).optional().describe('Stores where the tax is available'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

let mapTax = (t: any) => ({
  taxId: t.id,
  taxName: t.name,
  taxType: t.type,
  taxRate: t.rate,
  storeIds: t.stores ?? undefined,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
  deletedAt: t.deleted_at
});

export let listTaxes = SlateTool.create(spec, {
  name: 'List Taxes',
  key: 'list_taxes',
  description: `Retrieve tax configurations. Taxes can be applied to items and receipts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      taxIds: z.array(z.string()).optional().describe('Only return taxes with these IDs'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Only return taxes created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Only return taxes created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Only return taxes updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Only return taxes updated at or before this ISO 8601 UTC timestamp'),
      limit: z.number().min(1).max(250).optional().describe('Number of taxes to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      showDeleted: z.boolean().optional().describe('Include deleted taxes')
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
      taxIds: joinIds(ctx.input.taxIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let taxes = (result.taxes ?? []).map(mapTax);

    return {
      output: { taxes, cursor: result.cursor },
      message: `Retrieved **${taxes.length}** tax(es).`
    };
  })
  .build();

export let createOrUpdateTax = SlateTool.create(spec, {
  name: 'Create or Update Tax',
  key: 'create_or_update_tax',
  description: `Create a new tax rate or update an existing one. Taxes can be configured as included in or added to item prices. When updating, fields you omit keep their current values.`,
  instructions: ['taxName, taxType, and taxRate are required when creating a tax.']
})
  .input(
    z.object({
      taxId: z.string().optional().describe('Tax ID to update; omit to create'),
      taxName: z
        .string()
        .optional()
        .describe('Tax name (required when creating, max 20 characters)'),
      taxType: z
        .enum(['INCLUDED', 'ADDED'])
        .optional()
        .describe('Whether tax is included in or added to item price'),
      taxRate: z
        .number()
        .optional()
        .describe('Tax rate as a percentage between 0 and 100 (e.g., 5.255)'),
      storeIds: z.array(z.string()).optional().describe('Stores where the tax is available')
    })
  )
  .output(taxSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let isUpdate = !!input.taxId;

    let body: any = {};
    if (isUpdate) {
      let existing = await client.getTax(input.taxId!);
      body = pickWritable(existing, ['name', 'type', 'rate', 'stores']);
      body.id = input.taxId;
    } else {
      requireForCreate(input.taxName, 'taxName', 'tax');
      requireForCreate(input.taxType, 'taxType', 'tax');
      requireForCreate(input.taxRate, 'taxRate', 'tax');
    }

    if (input.taxName !== undefined) body.name = input.taxName;
    if (input.taxType !== undefined) body.type = input.taxType;
    if (input.taxRate !== undefined) body.rate = input.taxRate;
    if (input.storeIds !== undefined) body.stores = input.storeIds;

    let result = await client.createOrUpdateTax(body);

    return {
      output: mapTax(result),
      message: `${isUpdate ? 'Updated' : 'Created'} tax **${result.name ?? result.id}**.`
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
