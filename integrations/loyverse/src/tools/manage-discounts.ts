import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { pickWritable, requireForCreate } from '../lib/upsert';
import { spec } from '../spec';

let discountSchema = z.object({
  discountId: z.string().describe('Discount ID'),
  discountName: z.string().optional().describe('Discount name'),
  discountType: z
    .string()
    .optional()
    .describe(
      'Type: FIXED_PERCENT, FIXED_AMOUNT, VARIABLE_PERCENT, VARIABLE_AMOUNT, or DISCOUNT_BY_POINTS'
    ),
  discountValue: z
    .number()
    .nullable()
    .optional()
    .describe('Discount value (percentage or fixed amount, depending on type)'),
  discountPercent: z
    .number()
    .nullable()
    .optional()
    .describe('Percentage value (FIXED_PERCENT discounts)'),
  discountAmount: z
    .number()
    .nullable()
    .optional()
    .describe('Money amount (FIXED_AMOUNT discounts)'),
  storeIds: z.array(z.string()).optional().describe('Stores where the discount is available'),
  restrictedAccess: z
    .boolean()
    .optional()
    .describe('Whether applying the discount on the POS requires a password'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

let mapDiscount = (d: any) => ({
  discountId: d.id,
  discountName: d.name,
  discountType: d.type,
  discountValue: d.discount_percent ?? d.discount_amount ?? d.value,
  discountPercent: d.discount_percent,
  discountAmount: d.discount_amount,
  storeIds: d.stores ?? undefined,
  restrictedAccess: d.restricted_access,
  createdAt: d.created_at,
  updatedAt: d.updated_at,
  deletedAt: d.deleted_at
});

let LEGACY_TYPES: Record<string, string> = {
  PERCENTAGE: 'FIXED_PERCENT',
  FIXED: 'FIXED_AMOUNT'
};

export let listDiscounts = SlateTool.create(spec, {
  name: 'List Discounts',
  key: 'list_discounts',
  description: `Retrieve discount configurations. Discounts can be fixed or variable percentages or amounts, or discounts by loyalty points, applied at receipt or line-item level.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      discountIds: z
        .array(z.string())
        .optional()
        .describe('Only return discounts with these IDs'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Only return discounts created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Only return discounts created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Only return discounts updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Only return discounts updated at or before this ISO 8601 UTC timestamp'),
      limit: z.number().min(1).max(250).optional().describe('Number of discounts to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      showDeleted: z.boolean().optional().describe('Include deleted discounts')
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
      discountIds: joinIds(ctx.input.discountIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let discounts = (result.discounts ?? []).map(mapDiscount);

    return {
      output: { discounts, cursor: result.cursor },
      message: `Retrieved **${discounts.length}** discount(s).`
    };
  })
  .build();

export let createOrUpdateDiscount = SlateTool.create(spec, {
  name: 'Create or Update Discount',
  key: 'create_or_update_discount',
  description: `Create a new discount or update an existing one. Supports fixed percentage, fixed amount, variable (entered at sale), and loyalty-points discounts. When updating, fields you omit keep their current values.`,
  instructions: [
    'discountName and discountType are required when creating a discount.',
    'discountValue is required for FIXED_PERCENT (percentage, e.g. 10.5) and FIXED_AMOUNT (money amount) discounts, and must be omitted for VARIABLE_PERCENT, VARIABLE_AMOUNT, and DISCOUNT_BY_POINTS.',
    'PERCENTAGE and FIXED are accepted as aliases for FIXED_PERCENT and FIXED_AMOUNT.'
  ]
})
  .input(
    z.object({
      discountId: z.string().optional().describe('Discount ID to update; omit to create'),
      discountName: z
        .string()
        .optional()
        .describe('Discount name (required when creating, max 40 characters)'),
      discountType: z
        .enum([
          'FIXED_PERCENT',
          'FIXED_AMOUNT',
          'VARIABLE_PERCENT',
          'VARIABLE_AMOUNT',
          'DISCOUNT_BY_POINTS',
          'PERCENTAGE',
          'FIXED'
        ])
        .optional()
        .describe('Discount type (required when creating)'),
      discountValue: z
        .number()
        .optional()
        .describe('Percentage for FIXED_PERCENT or money amount for FIXED_AMOUNT'),
      storeIds: z
        .array(z.string())
        .optional()
        .describe('Stores where the discount is available (default: all stores)'),
      restrictedAccess: z
        .boolean()
        .optional()
        .describe('Require a password to apply the discount on the POS')
    })
  )
  .output(discountSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let isUpdate = !!input.discountId;

    let body: any = {};
    if (isUpdate) {
      let existing = await client.getDiscount(input.discountId!);
      body = pickWritable(existing, [
        'name',
        'type',
        'discount_amount',
        'discount_percent',
        'stores',
        'restricted_access'
      ]);
      body.id = input.discountId;
    } else {
      requireForCreate(input.discountName, 'discountName', 'discount');
      requireForCreate(input.discountType, 'discountType', 'discount');
    }

    if (input.discountName !== undefined) body.name = input.discountName;
    if (input.discountType !== undefined) {
      body.type = LEGACY_TYPES[input.discountType] ?? input.discountType;
    }
    if (input.storeIds !== undefined) body.stores = input.storeIds;
    if (input.restrictedAccess !== undefined) body.restricted_access = input.restrictedAccess;

    let type = body.type as string | undefined;
    let { discount_percent, discount_amount, ...rest } = body;
    body = rest;
    if (type === 'FIXED_PERCENT' && discount_percent !== undefined)
      body.discount_percent = discount_percent;
    if (type === 'FIXED_AMOUNT' && discount_amount !== undefined)
      body.discount_amount = discount_amount;

    if (input.discountValue !== undefined) {
      if (type === 'FIXED_PERCENT') body.discount_percent = input.discountValue;
      else if (type === 'FIXED_AMOUNT') body.discount_amount = input.discountValue;
      else {
        throw createApiServiceError(
          `discountValue only applies to FIXED_PERCENT and FIXED_AMOUNT discounts; ${type ?? 'this'} discounts take their value at the time of sale.`,
          { reason: 'invalid_input' }
        );
      }
    }

    if (type === 'FIXED_PERCENT') {
      requireForCreate(body.discount_percent, 'discountValue', 'fixed percentage discount');
    } else if (type === 'FIXED_AMOUNT') {
      requireForCreate(body.discount_amount, 'discountValue', 'fixed amount discount');
    }

    let result = await client.createOrUpdateDiscount(body);

    return {
      output: mapDiscount(result),
      message: `${isUpdate ? 'Updated' : 'Created'} discount **${result.name ?? result.id}**.`
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
