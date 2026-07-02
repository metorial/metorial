import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let discountSchema = z.object({
  discountId: z.string().describe('Discount ID'),
  discountName: z.string().optional().describe('Discount name'),
  discountType: z.string().optional().describe('Type: PERCENTAGE or FIXED'),
  discountValue: z.number().optional().describe('Discount value (percentage or fixed amount)'),
  restrictedAccess: z.boolean().optional().describe('Whether restricted to certain roles'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

export let listDiscounts = SlateTool.create(spec, {
  name: 'List Discounts',
  key: 'list_discounts',
  description: `Retrieve all discount configurations. Discounts can be percentage-based or fixed amounts, applied at receipt or item level.`,
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
      discounts: z.array(discountSchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDiscounts({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let discounts = (result.discounts ?? []).map((d: any) => ({
      discountId: d.id,
      discountName: d.name,
      discountType: d.type,
      discountValue: d.value,
      restrictedAccess: d.restricted_access,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      deletedAt: d.deleted_at
    }));

    return {
      output: { discounts, cursor: result.cursor },
      message: `Retrieved **${discounts.length}** discount(s).`
    };
  })
  .build();

export let createOrUpdateDiscount = SlateTool.create(spec, {
  name: 'Create or Update Discount',
  key: 'create_or_update_discount',
  description: `Create a new discount or update an existing one. Supports percentage and fixed-amount discounts.`
})
  .input(
    z.object({
      discountId: z.string().optional().describe('Discount ID to update; omit to create'),
      discountName: z.string().optional().describe('Discount name'),
      discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().describe('Discount type'),
      discountValue: z.number().optional().describe('Discount value'),
      restrictedAccess: z.boolean().optional().describe('Restrict to certain roles')
    })
  )
  .output(discountSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {};
    if (ctx.input.discountId) body.id = ctx.input.discountId;
    if (ctx.input.discountName !== undefined) body.name = ctx.input.discountName;
    if (ctx.input.discountType !== undefined) body.type = ctx.input.discountType;
    if (ctx.input.discountValue !== undefined) body.value = ctx.input.discountValue;
    if (ctx.input.restrictedAccess !== undefined)
      body.restricted_access = ctx.input.restrictedAccess;

    let result = await client.createOrUpdateDiscount(body);
    let isUpdate = !!ctx.input.discountId;

    return {
      output: {
        discountId: result.id,
        discountName: result.name,
        discountType: result.type,
        discountValue: result.value,
        restrictedAccess: result.restricted_access,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        deletedAt: result.deleted_at
      },
      message: `${isUpdate ? 'Updated' : 'Created'} discount **${result.name}**.`
    };
  })
  .build();

export let deleteDiscount = SlateTool.create(spec, {
  name: 'Delete Discount',
  key: 'delete_discount',
  description: `Delete a discount by its ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      discountId: z.string().describe('ID of the discount to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDiscount(ctx.input.discountId);

    return {
      output: { deleted: true },
      message: `Deleted discount \`${ctx.input.discountId}\`.`
    };
  })
  .build();
